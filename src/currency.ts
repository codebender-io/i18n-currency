/**
 * CurrencyLibrary - Locale-aware currency utility
 *
 * Key Design Principles:
 * - No internal caching of derived results (e.g., merged locale maps)
 * - All expensive operations are computed on-demand
 * - Memory efficiency through O(1) lookup indexes built once
 * - Callers responsible for any long-lived caching needs
 * - Immutable internal state to prevent accidental mutation
 */

// Import static data files - these are considered immutable and read-only
import baseCurrencies from "./data/base-currencies.json";
import countryCurrencies from "./data/country-currencies.json";
import supportedLocales from "./data/supported-locales.json";
import type {
	CountryCode,
	CountryCurrencyMap,
	Currency,
	CurrencyBase,
	CurrencyBaseMap,
	CurrencyCode,
	CurrencyLibraryProps,
	CurrencyLocalized,
	CurrencyMap,
	LocaleCode,
	LocaleCurrencyMap,
	Logger,
} from "./types.js";

/**
 * CurrencyLibrary - Locale-Aware Currency Utility
 *
 * A robust, memory-efficient library for currency data lookup and localization.
 *
 * DESIGN PHILOSOPHY:
 * - No internal caching of expensive derived results (caller manages caching)
 * - O(1) lookup performance via pre-built indexes
 * - Immutable internal state to prevent accidental mutation
 * - Memory safety through prototype-pollution-safe objects
 * - Locale normalization and best-match fallback resolution
 *
 * PERFORMANCE CHARACTERISTICS:
 * - Constructor: O(n) where n = number of base currencies
 * - getMap(): O(m) where m = number of currencies in base dataset
 * - getCurrency(): O(1) via hash lookup
 * - All other methods: O(1) or O(k) where k is typically small
 *
 * MEMORY USAGE:
 * - Fixed: base datasets (~few KB)
 * - Fixed: locale data (provided by caller)
 * - Fixed: lookup indexes (~2x base currency count)
 * - Transient: method return values (garbage collected)
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const library = new CurrencyLibrary({
 *   locales: { 'en': { USD: { name: 'US Dollar', ... } } },
 *   fallbackLocale: 'en'
 * });
 *
 * // Caller manages caching if needed
 * const currencyMap = library.getMap('en-US');
 * ```
 */
export class CurrencyLibrary {
	// Immutable locale mapping provided by caller
	private readonly locales: LocaleCurrencyMap;
	// Resolved fallback locale (canonical form)
	private readonly fallbackLocale: LocaleCode;
	// Base currency dataset (immutable JSON import)
	private readonly baseMap: CurrencyBaseMap = baseCurrencies;
	// Country to currency mapping (immutable JSON import)
	private readonly countryCurrencyMap: CountryCurrencyMap = countryCurrencies;
	// Supported locale roots for validation
	private readonly supportedLocaleRoots: Set<LocaleCode>;
	// Optional logger for warnings and info
	private readonly logger: Logger | undefined;

	// Fast O(1) lookup indexes - built once in constructor
	// Uses Object.create(null) for prototype pollution protection
	private readonly alphaIndex: Record<string, CurrencyBase> = Object.create(null);
	private readonly numericIndex: Record<string, CurrencyBase> = Object.create(null);

	/**
	 * Constructs a CurrencyLibrary instance.
	 *
	 * PERFORMANCE: O(n) where n is number of base currencies + locales
	 * MEMORY: Builds immutable indexes and normalizes locale data
	 *
	 * @param props - Configuration properties
	 * @param props.locales - Mapping of locale tags to localized currency data
	 * @param props.fallbackLocale - Fallback locale (default: "en")
	 * @param props.logger - Optional logger instance
	 *
	 * @throws {Error} If locales is missing or invalid
	 * @throws {Error} If fallback locale cannot be resolved
	 *
	 * @example
	 * ```typescript
	 * const lib = new CurrencyLibrary({
	 *   locales: {
	 *     'en': { USD: { name: 'US Dollar', name_plural: 'US dollars' } },
	 *     'fr': { USD: { name: 'dollar américain', name_plural: 'dollars américains' } }
	 *   },
	 *   fallbackLocale: 'en'
	 * });
	 * ```
	 */
	constructor({ locales, fallbackLocale = "en", logger }: CurrencyLibraryProps) {
		this.logger = logger;

		// Validate required parameters
		if (!locales || typeof locales !== "object") {
			throw new Error("`locales` must be an object mapping locale tags to localized currency maps");
		}

		// Build normalized set of supported locale roots for validation
		// These come from supported-locales.json and represent known valid locales
		this.supportedLocaleRoots = new Set(supportedLocales.map((s) => CurrencyLibrary.normalizeLocaleRoot(s)));

		// Normalize and validate provided locale data
		const normalizedLocales: LocaleCurrencyMap = Object.create(null);

		// Process each provided locale map
		for (const [rawLocaleKey, localeMap] of Object.entries(locales)) {
			const canonical = CurrencyLibrary.normalizeLocale(rawLocaleKey);

			// Initialize locale entry if not present
			normalizedLocales[canonical] = normalizedLocales[canonical] ?? Object.create(null);

			// Normalize currency codes within this locale map (trim + uppercase)
			for (const [rawCur, data] of Object.entries(localeMap)) {
				const curKey = rawCur.trim().toUpperCase();
				normalizedLocales[canonical][curKey] = { ...data };
			}

			// Ensure language root locale exists (e.g., "en" from "en-US")
			const root = CurrencyLibrary.normalizeLocaleRoot(canonical);
			if (!normalizedLocales[root]) {
				// Create shallow copy to avoid reference sharing issues
				normalizedLocales[root] = { ...normalizedLocales[canonical] };
			}
		}

		// Resolve and validate fallback locale with comprehensive fallback chain
		const canonicalFallback = CurrencyLibrary.normalizeLocale(fallbackLocale);
		const fbkRoot = CurrencyLibrary.normalizeLocaleRoot(canonicalFallback);
		const bestMatch = CurrencyLibrary.bestMatch(canonicalFallback, this.supportedLocaleRoots, "en");

		let resolvedFallback: LocaleCode | undefined = undefined;

		// Fallback resolution chain: exact -> root -> best match -> "en"
		if (canonicalFallback && normalizedLocales[canonicalFallback]) {
			resolvedFallback = canonicalFallback;
		} else if (fbkRoot && normalizedLocales[fbkRoot]) {
			resolvedFallback = fbkRoot;
		} else if (normalizedLocales[bestMatch]) {
			resolvedFallback = bestMatch;
		}

		// Validate we found a usable fallback
		if (!resolvedFallback) {
			const available = Object.keys(normalizedLocales).join(", ");
			throw new Error(
				`Fallback locale "${fallbackLocale}" not available. ` +
					`Tried: "${canonicalFallback}", "${fbkRoot}", "${bestMatch}". ` +
					`Available locales: ${available}`,
			);
		}

		// Freeze locale data to prevent external mutation
		// NOTE: This is not caching - it's immutability enforcement
		for (const [loc, map] of Object.entries(normalizedLocales)) {
			const safeMap: Record<string, CurrencyLocalized> = Object.create(null);
			for (const [k, v] of Object.entries(map)) {
				safeMap[k] = { ...v };
				Object.freeze(safeMap[k]);
			}
			normalizedLocales[loc] = Object.freeze(safeMap);
		}

		this.locales = Object.freeze(normalizedLocales);
		this.fallbackLocale = resolvedFallback;

		// Build O(1) lookup indexes from base currency data
		// These indexes are built once and never updated
		for (const [alphaKey, base] of Object.entries(this.baseMap)) {
			const upAlpha = alphaKey.toUpperCase();
			this.alphaIndex[upAlpha] = base;

			// Build numeric index with zero-padded 3-digit keys
			const numericRaw = base.numeric_code;
			if (numericRaw !== undefined && numericRaw !== null) {
				const numericKey = String(numericRaw).padStart(3, "0");
				this.numericIndex[numericKey] = base;
			}
		}
	}

	/* -------------------------------------------------------------------------
	 * Locale Normalization and Validation
	 * ---------------------------------------------------------------------- */

	/**
	 * Normalizes a locale string to canonical BCP-47 form.
	 *
	 * PERFORMANCE: O(1) for typical inputs
	 *
	 * @param input - Raw locale string (e.g., "en_US", "en-us")
	 * @returns Canonical locale tag (e.g., "en-US")
	 * @throws {Error} If input is not a string
	 *
	 * @example
	 * ```typescript
	 * normalizeLocale("en_US"); // "en-US"
	 * normalizeLocale("fr_CA"); // "fr-CA"
	 * ```
	 */
	private static normalizeLocale(input: string): LocaleCode {
		if (!input || typeof input !== "string") {
			throw new Error("Locale must be a non-empty string");
		}

		const cleaned = input.trim().replace(/_/g, "-");

		try {
			// Use Intl.getCanonicalLocales if available for proper BCP-47 normalization
			const canonical =
				typeof Intl !== "undefined" && typeof Intl.getCanonicalLocales === "function" ? Intl.getCanonicalLocales(cleaned)[0] : cleaned;
			return canonical || cleaned;
		} catch {
			// Fallback to cleaned version if canonicalization fails
			return cleaned;
		}
	}

	/**
	 * Extracts the root language subtag from a locale string.
	 *
	 * PERFORMANCE: O(1)
	 *
	 * @param input - Locale string (e.g., "en-US", "fr_CA")
	 * @returns Root language code in lowercase (e.g., "en", "fr")
	 * @throws {Error} If input is not a string
	 *
	 * @example
	 * ```typescript
	 * normalizeLocaleRoot("en-US"); // "en"
	 * normalizeLocaleRoot("zh-Hans-CN"); // "zh"
	 * ```
	 */
	private static normalizeLocaleRoot(input: string): LocaleCode {
		if (!input || typeof input !== "string") {
			throw new Error("Locale must be a non-empty string");
		}

		const cleaned = input.trim().replace(/_/g, "-");
		return cleaned.split("-")[0].toLowerCase();
	}

	/**
	 * Finds the best matching locale from supported roots.
	 *
	 * PERFORMANCE: O(1) - Set.has() is O(1)
	 *
	 * @param locale - Input locale to match
	 * @param supported - Set of supported locale roots
	 * @param defaultFallback - Ultimate fallback if no match found
	 * @returns Best matching locale root
	 *
	 * @example
	 * ```typescript
	 * const supported = new Set(['en', 'fr', 'es']);
	 * bestMatch('fr-CA', supported, 'en'); // 'fr'
	 * bestMatch('de-DE', supported, 'en'); // 'en'
	 * ```
	 */
	private static bestMatch(locale: string, supported: Set<string>, defaultFallback: string): LocaleCode {
		const root = (locale || "").split("-")[0].toLowerCase();
		return supported.has(root) ? root : defaultFallback;
	}

	/* -------------------------------------------------------------------------
	 * Currency and Country Code Normalization
	 * ---------------------------------------------------------------------- */

	/**
	 * Normalizes currency code to canonical form.
	 *
	 * Handles both alphabetic (USD) and numeric (840) ISO 4217 codes.
	 * Numeric codes are zero-padded to 3 digits for consistency.
	 *
	 * PERFORMANCE: O(1)
	 *
	 * @param input - Raw currency code (e.g., "usd", "36", "840")
	 * @returns Normalized code (e.g., "USD", "036", "840")
	 * @throws {Error} If input is invalid or empty
	 *
	 * @example
	 * ```typescript
	 * normalizeCurrencyCode("usd"); // "USD"
	 * normalizeCurrencyCode("36");  // "036"
	 * normalizeCurrencyCode("840"); // "840"
	 * ```
	 */
	private static normalizeCurrencyCode(input: string): CurrencyCode {
		if (!input || typeof input !== "string") {
			throw new Error("Currency code is required");
		}

		const s = input.trim();
		if (!s) {
			throw new Error("Currency code is empty after trimming");
		}

		// Handle numeric codes (1-3 digits)
		if (/^\d{1,3}$/.test(s)) {
			return s.padStart(3, "0");
		}

		// Handle alphabetic codes (3 letters)
		const alpha = s.toUpperCase();
		if (!/^[A-Z]{3}$/.test(alpha)) {
			throw new Error(`Invalid currency code "${input}" - must be 3 letters or 1-3 digits`);
		}

		return alpha;
	}

	/**
	 * Normalizes country code to ISO 3166-1 alpha-2 uppercase.
	 *
	 * PERFORMANCE: O(1)
	 *
	 * @param input - Raw country code (e.g., "us", "Fr")
	 * @returns Normalized country code (e.g., "US", "FR")
	 * @throws {Error} If input is invalid
	 *
	 * @example
	 * ```typescript
	 * normalizeCountryCode("us"); // "US"
	 * normalizeCountryCode("fr"); // "FR"
	 * ```
	 */
	private static normalizeCountryCode(input: string): CountryCode {
		if (!input || typeof input !== "string") {
			throw new Error("Country code is required");
		}

		const s = input.trim().toUpperCase();
		if (!/^[A-Z]{2}$/.test(s)) {
			throw new Error(`Invalid country code "${input}" - must be 2 letters`);
		}

		return s;
	}

	/* -------------------------------------------------------------------------
	 * Public API - Locale-Aware Currency Access
	 * ---------------------------------------------------------------------- */

	/**
	 * Finds the best available locale match for the given input.
	 *
	 * Lookup order:
	 * 1. Exact canonical match (e.g., "fr-CA")
	 * 2. Language root match (e.g., "fr")
	 * 3. Configured fallback locale
	 *
	 * PERFORMANCE: O(1) - normalized lookup
	 *
	 * @param locale - Requested locale string
	 * @returns Best available locale from provided data
	 *
	 * @example
	 * ```typescript
	 * // If only 'fr' is provided, but 'fr-CA' requested:
	 * getLocaleBestMatch('fr-CA'); // 'fr'
	 *
	 * // If no match found:
	 * getLocaleBestMatch('de-DE'); // 'en' (fallback)
	 * ```
	 */
	getLocaleBestMatch(locale: string): LocaleCode {
		try {
			const normalized = CurrencyLibrary.normalizeLocale(locale);

			// Exact match check
			if (this.locales[normalized]) {
				return normalized;
			}

			// Root language match check
			const root = CurrencyLibrary.normalizeLocaleRoot(normalized);
			if (this.locales[root]) {
				return root;
			}

			// Fallback to configured default
			return this.fallbackLocale;
		} catch (err) {
			this.logger?.warn?.((err as Error).message);
			return this.fallbackLocale;
		}
	}

	/**
	 * Retrieves complete currency map for a locale.
	 *
	 * IMPORTANT: This method performs O(n) work each call and returns a new object.
	 * Callers should cache the result if repeated access is needed.
	 *
	 * PERFORMANCE: O(n) where n = number of base currencies
	 * MEMORY: Returns new object each call - caller manages caching
	 *
	 * @param locale - Target locale for localization
	 * @returns Map of currency codes to merged Currency objects
	 *
	 * @example
	 * ```typescript
	 * // First call - builds complete map
	 * const map1 = lib.getMap('en');
	 *
	 * // Second call - builds again (caller should cache if needed)
	 * const map2 = lib.getMap('en');
	 *
	 * // map1 !== map2 (new object each time)
	 * ```
	 */
	getMap(locale: string): CurrencyMap {
		const bestLocale = this.getLocaleBestMatch(locale);
		const map: CurrencyMap = Object.create(null);
		const localeMap = this.locales[bestLocale] ?? Object.create(null);
		const fallbackMap = this.locales[this.fallbackLocale] ?? Object.create(null);

		// Build merged currency map by combining base data with localized strings
		// This loop is the expensive part - O(n) where n = base currency count
		for (const [codeRaw, baseCurrency] of Object.entries(this.baseMap)) {
			const code = codeRaw.toUpperCase();

			// Find localized data: first in target locale, then fallback
			const localized = localeMap[code] ?? fallbackMap[code];

			if (!localized) {
				this.logger?.warn?.(`Currency ${code} not localized for locale "${bestLocale}" or fallback "${this.fallbackLocale}"`);
				continue;
			}

			// Create merged currency object
			map[code] = { ...baseCurrency, ...localized };
		}

		return map;
	}

	/**
	 * Retrieves currency list for a locale.
	 *
	 * PERFORMANCE: O(n) - calls getMap() internally
	 * MEMORY: Returns new array each call
	 *
	 * @param locale - Target locale
	 * @returns Array of Currency objects
	 *
	 * @example
	 * ```typescript
	 * const currencies = lib.getList('en');
	 * currencies.forEach(currency => {
	 *   console.log(currency.name, currency.symbol);
	 * });
	 * ```
	 */
	getList(locale: string): Currency[] {
		return Object.values(this.getMap(locale));
	}

	/**
	 * Retrieves a single currency by code for the given locale.
	 *
	 * Accepts both alphabetic ("USD") and numeric ("840") codes.
	 * Uses O(1) lookup via pre-built indexes.
	 *
	 * PERFORMANCE: O(1) - hash lookup
	 * MEMORY: Returns new object each call
	 *
	 * @param locale - Target locale for localization
	 * @param code - Currency code (alpha or numeric)
	 * @returns Merged Currency object or undefined if not found
	 *
	 * @example
	 * ```typescript
	 * // Alphabetic code
	 * const usd = lib.getCurrency('en', 'USD');
	 *
	 * // Numeric code
	 * const usdNumeric = lib.getCurrency('en', '840');
	 *
	 * // Both return the same currency object
	 * ```
	 */
	getCurrency(locale: string, code: string): Currency | undefined {
		const bestLocale = this.getLocaleBestMatch(locale);

		// Normalize input code
		let normalizedCode: string;
		try {
			normalizedCode = CurrencyLibrary.normalizeCurrencyCode(code);
		} catch (err) {
			this.logger?.warn?.((err as Error).message);
			return undefined;
		}

		// O(1) lookup using pre-built indexes
		let baseCurrency: CurrencyBase | undefined;
		if (/^\d{3}$/.test(normalizedCode)) {
			baseCurrency = this.numericIndex[normalizedCode];
		} else {
			baseCurrency = this.alphaIndex[normalizedCode];
		}

		if (!baseCurrency) {
			this.logger?.warn?.(`Currency code "${code}" not found in base dataset`);
			return undefined;
		}

		const alphaCode = baseCurrency.code.toUpperCase();

		// Find localized data with fallback
		const localized = this.locales[bestLocale]?.[alphaCode] ?? this.locales[this.fallbackLocale]?.[alphaCode];

		if (!localized) {
			this.logger?.warn?.(`Currency "${alphaCode}" not found in locale "${bestLocale}" or fallback "${this.fallbackLocale}"`);
			return undefined;
		}

		// Return merged object (new instance each call)
		return { ...baseCurrency, ...localized };
	}

	/* -------------------------------------------------------------------------
	 * Public API - Utility Methods and Country Lookups
	 * ---------------------------------------------------------------------- */

	/**
	 * Checks if a currency exists in the base dataset.
	 *
	 * PERFORMANCE: O(1) - hash lookup
	 *
	 * @param code - Currency code (alpha or numeric)
	 * @returns True if currency exists
	 *
	 * @example
	 * ```typescript
	 * hasCurrency('USD'); // true
	 * hasCurrency('840'); // true (USD numeric)
	 * hasCurrency('XYZ'); // false
	 * ```
	 */
	hasCurrency(code: string): boolean {
		if (!code) return false;

		try {
			const normalized = CurrencyLibrary.normalizeCurrencyCode(code);
			if (/^\d{3}$/.test(normalized)) {
				return normalized in this.numericIndex;
			}
			return normalized in this.alphaIndex;
		} catch {
			return false;
		}
	}

	/**
	 * Gets all currency codes used by a country.
	 *
	 * Returns alphabetic codes where possible, falls back to numeric.
	 *
	 * PERFORMANCE: O(k) where k = number of currencies for country (typically small)
	 *
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Array of currency codes
	 *
	 * @example
	 * ```typescript
	 * getCurrenciesByCountry('US'); // ['USD']
	 * getCurrenciesByCountry('CA'); // ['CAD']
	 * getCurrenciesByCountry('XX'); // [] (with warning)
	 * ```
	 */
	getCurrenciesByCountry(countryCode: string): CurrencyCode[] {
		let normalizedCountry: CountryCode;
		try {
			normalizedCountry = CurrencyLibrary.normalizeCountryCode(countryCode);
		} catch (err) {
			this.logger?.warn?.((err as Error).message);
			return [];
		}

		const currencies = this.countryCurrencyMap[normalizedCountry];
		if (!currencies) {
			this.logger?.warn?.(`Country code "${normalizedCountry}" not found`);
			return [];
		}

		// Convert to normalized codes, preferring alphabetic where possible
		return currencies.map((currencyCode) => {
			try {
				const normalized = CurrencyLibrary.normalizeCurrencyCode(currencyCode);

				// Convert numeric codes to alphabetic if possible
				if (/^\d{3}$/.test(normalized)) {
					const base = this.numericIndex[normalized];
					if (!base) {
						this.logger?.warn?.(`Numeric currency code "${normalized}" in country "${normalizedCountry}" not found in base dataset`);
						return normalized; // Return numeric as fallback
					}
					return base.code.toUpperCase(); // Prefer alphabetic code
				}

				// Validate alphabetic code exists
				const alpha = normalized.toUpperCase();
				if (!(alpha in this.alphaIndex)) {
					this.logger?.warn?.(`Currency code "${alpha}" referenced for country "${normalizedCountry}" not in base dataset`);
				}
				return alpha;
			} catch {
				// Fallback for malformed codes
				return currencyCode.trim().toUpperCase();
			}
		});
	}

	/**
	 * Gets localized currency data for all currencies used by a country.
	 *
	 * PERFORMANCE: O(k) where k = number of country currencies
	 * MEMORY: Returns new array each call
	 *
	 * @param locale - Target locale for localization
	 * @param countryCode - ISO country code
	 * @returns Array of Currency objects (missing localizations are filtered out)
	 *
	 * @example
	 * ```typescript
	 * const usCurrencies = lib.getCountryCurrencyData('en', 'US');
	 * // Returns [ { code: 'USD', name: 'US Dollar', ... } ]
	 * ```
	 */
	getCountryCurrencyData(locale: string, countryCode: string): Currency[] {
		const currencyCodes = this.getCurrenciesByCountry(countryCode);

		// Map codes to currency objects and filter out missing localizations
		return currencyCodes.map((code) => this.getCurrency(locale, code)).filter((currency): currency is Currency => currency !== undefined);
	}

	/**
	 * Gets the primary currency code for a country.
	 *
	 * Returns the first currency in the country's currency list.
	 *
	 * PERFORMANCE: O(k) where k = number of country currencies
	 *
	 * @param countryCode - ISO country code
	 * @returns Primary currency code or undefined
	 *
	 * @example
	 * ```typescript
	 * getPrimaryCurrencyByCountry('US'); // 'USD'
	 * getPrimaryCurrencyByCountry('XX'); // undefined
	 * ```
	 */
	getPrimaryCurrencyByCountry(countryCode: string): CurrencyCode | undefined {
		const currencies = this.getCurrenciesByCountry(countryCode);
		return currencies.length > 0 ? currencies[0] : undefined;
	}

	/**
	 * Checks if a country uses multiple currencies.
	 *
	 * PERFORMANCE: O(k) where k = number of country currencies
	 *
	 * @param countryCode - ISO country code
	 * @returns True if country has multiple currencies
	 *
	 * @example
	 * ```typescript
	 * hasMultipleCurrencies('US'); // false
	 * hasMultipleCurrencies('CU'); // true (Cuba uses CUC and CUP)
	 * ```
	 */
	hasMultipleCurrencies(countryCode: string): boolean {
		const currencies = this.getCurrenciesByCountry(countryCode);
		return currencies.length > 1;
	}

	/**
	 * Gets all supported country codes.
	 *
	 * PERFORMANCE: O(1) - cached country map keys
	 *
	 * @returns Array of country codes in uppercase
	 *
	 * @example
	 * ```typescript
	 * const countries = lib.getSupportedCountryCodes();
	 * // Returns ['US', 'CA', 'GB', 'FR', ...]
	 * ```
	 */
	getSupportedCountryCodes(): CountryCode[] {
		return Object.keys(this.countryCurrencyMap).map((c) => c.toUpperCase());
	}

	/**
	 * Gets all countries that use a specific currency.
	 *
	 * Accepts both alphabetic and numeric currency codes.
	 *
	 * PERFORMANCE: O(m) where m = number of countries (linear scan)
	 *
	 * @param currencyCode - Currency code (alpha or numeric)
	 * @returns Array of country codes that use this currency
	 *
	 * @example
	 * ```typescript
	 * getCountriesByCurrency('USD'); // ['US', 'EC', 'SV', ...]
	 * getCountriesByCurrency('840'); // same result
	 * ```
	 */
	getCountriesByCurrency(currencyCode: string): CountryCode[] {
		let normalizedCode: string;
		try {
			normalizedCode = CurrencyLibrary.normalizeCurrencyCode(currencyCode);
		} catch (err) {
			this.logger?.warn?.((err as Error).message);
			return [];
		}

		// Convert numeric code to alphabetic code if possible
		let targetAlphaCode: string | undefined;
		let targetNumericCode: string | undefined;

		if (/^\d{3}$/.test(normalizedCode)) {
			// It's a numeric code - find the corresponding alpha code
			targetNumericCode = normalizedCode;
			const baseFromNumeric = this.numericIndex[normalizedCode];
			targetAlphaCode = baseFromNumeric?.code.toUpperCase();
		} else {
			// It's an alphabetic code
			targetAlphaCode = normalizedCode;
			const baseFromAlpha = this.alphaIndex[normalizedCode];
			targetNumericCode = baseFromAlpha?.numeric_code?.padStart(3, "0");
		}

		return Object.entries(this.countryCurrencyMap)
			.filter(([_, currencies]) =>
				currencies.some((c) => {
					try {
						const normalized = CurrencyLibrary.normalizeCurrencyCode(c);

						// Check if this currency in country list matches our target
						if (/^\d{3}$/.test(normalized)) {
							// Country uses numeric code - compare with target numeric
							return normalized === targetNumericCode;
						} else {
							// Country uses alphabetic code - compare with target alpha
							return normalized === targetAlphaCode;
						}
					} catch {
						// Fallback comparison for malformed codes
						const trimmedUpper = c.trim().toUpperCase();
						return trimmedUpper === targetAlphaCode || trimmedUpper === targetNumericCode;
					}
				}),
			)
			.map(([country]) => country.toUpperCase());
	}

	/**
	 * Gets all available currency codes from base dataset.
	 *
	 * PERFORMANCE: O(n) where n = number of base currencies
	 *
	 * @returns Array of alphabetic currency codes in uppercase
	 *
	 * @example
	 * ```typescript
	 * const codes = lib.getCurrencyCodes();
	 * // Returns ['USD', 'EUR', 'GBP', 'JPY', ...]
	 * ```
	 */
	getCurrencyCodes(): CurrencyCode[] {
		return Object.keys(this.baseMap).map((c) => c.toUpperCase());
	}

	/**
	 * Gets all available locale keys provided to constructor.
	 *
	 * PERFORMANCE: O(1) - cached locale keys
	 *
	 * @returns Array of canonical locale codes
	 *
	 * @example
	 * ```typescript
	 * const locales = lib.getAvailableLocales();
	 * // Returns ['en', 'en-US', 'fr', 'fr-CA', ...]
	 * ```
	 */
	getAvailableLocales(): LocaleCode[] {
		return Object.keys(this.locales);
	}

	/**
	 * Checks if a locale is supported by the library.
	 *
	 * Checks against supported-locales.json roots, not provided locale data.
	 *
	 * PERFORMANCE: O(1) - Set lookup
	 *
	 * @param locale - Locale to check
	 * @returns True if locale root is supported
	 *
	 * @example
	 * ```typescript
	 * isLocaleSupported('en-US'); // true
	 * isLocaleSupported('en');    // true
	 * isLocaleSupported('xx');    // false
	 * ```
	 */
	isLocaleSupported(locale: string): boolean {
		try {
			const normalizedRoot = CurrencyLibrary.normalizeLocaleRoot(locale);
			return this.supportedLocaleRoots.has(normalizedRoot);
		} catch {
			return false;
		}
	}
}
