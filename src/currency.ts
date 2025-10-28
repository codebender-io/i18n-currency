import baseCurrencies from "./data/base-currencies.json" with { type: "json" };
import countryCurrencies from "./data/country-currencies.json" with { type: "json" };
import supportedLocales from "./data/supported-locales.json" with { type: "json" };
import type {
	CountryCode,
	CountryCurrencyMap,
	Currency,
	CurrencyBaseMap,
	CurrencyCode,
	CurrencyMap,
	LocaleCode,
	LocaleCurrencyMap,
} from "./types.js";

/**
 * Properties for initializing a CurrencyLibrary instance.
 */
export interface CurrencyLibraryProps {
	/** Map of localized currency data by locale. */
	locales: LocaleCurrencyMap;
	/** Fallback locale if requested locale is not available. Defaults to "en". */
	fallbackLocale?: LocaleCode;
}

/**
 * CurrencyLibrary
 *
 * Provides utility methods to query currency information by locale and country.
 * Handles localization, code normalization, and caching for fast lookups.
 */
export class CurrencyLibrary {
	private readonly locales: LocaleCurrencyMap;
	private readonly fallbackLocale: LocaleCode;
	private readonly baseMap: CurrencyBaseMap = baseCurrencies;
	private readonly countryCurrencyMap: CountryCurrencyMap = countryCurrencies;
	private readonly supportedLocales: Set<LocaleCode> = new Set(supportedLocales);

	/**
	 * Constructs a CurrencyLibrary instance.
	 * @param locales - Localized currency map by locale
	 * @param fallbackLocale - Optional fallback locale (default "en")
	 * @throws If fallback locale is not found in provided locales
	 */
	constructor({ locales, fallbackLocale = "en" }: CurrencyLibraryProps) {
		const fbk = CurrencyLibrary.bestMatch(fallbackLocale, this.supportedLocales, "en");

		if (!locales[fbk]) {
			throw new Error(`Fallback locale "${fallbackLocale}" (resolved to "${fbk}") not provided in locales`);
		}

		this.locales = locales;
		this.fallbackLocale = fbk;
	}

	/**
	 * Determines the best matching locale (root language match).
	 * @param locale - Input locale string, e.g., "en-US"
	 * @param supported - Set of supported locale roots
	 * @param defaultFallback - Fallback locale if none matched
	 * @returns The matched locale root code
	 */
	private static bestMatch(locale: string, supported: Set<string>, defaultFallback: string): LocaleCode {
		const root = locale.split("-")[0];
		return supported.has(root) ? (root as LocaleCode) : (defaultFallback as LocaleCode);
	}

	/**
	 * Returns the best supported locale match for a given locale string.
	 * @param locale - Input locale (e.g., "en-US")
	 * @returns Matched supported locale code
	 */
	getLocaleBestMatch(locale: string): LocaleCode {
		const root = locale.split("-")[0];
		return this.supportedLocales.has(root) ? root : this.fallbackLocale;
	}

	/**
	 * Retrieves the full currency map for a given locale.
	 * Merges base currency data with localized names.
	 * @param locale - Target locale code
	 * @returns A map of currency codes to localized currency objects
	 */
	getMap(locale: string): CurrencyMap {
		const l = this.getLocaleBestMatch(locale);

		const map: CurrencyMap = {};
		const localeMap = this.locales[l] ?? {};

		for (const [codeRaw, baseCurrency] of Object.entries(this.baseMap)) {
			const code = codeRaw.toUpperCase();
			const localized = localeMap[code] ?? localeMap[codeRaw];
			if (!localized) {
				console.warn(`Currency ${code} not found in locale ${l}`);
				continue;
			}
			map[code] = { ...baseCurrency, ...localized };
		}

		return map;
	}

	/**
	 * Returns an array of all currencies for a given locale.
	 * @param locale - Locale code
	 * @returns List of localized currency objects
	 */
	getList(locale: string): Currency[] {
		return Object.values(this.getMap(locale));
	}

	/**
	 * Retrieves a specific currency by code for the given locale.
	 * @param locale - Target locale code
	 * @param code - ISO 4217 currency code
	 * @returns Localized currency object, or undefined if not found
	 */
	getCurrency(locale: string, code: string): Currency | undefined {
		const l = this.getLocaleBestMatch(locale);
		const upper = code.toUpperCase();
		const baseCurrency = this.baseMap[upper] ?? this.baseMap[code];
		const localized = this.locales[l]?.[upper] ?? this.locales[l]?.[code];

		if (!baseCurrency) {
			console.warn(`Currency code "${upper}" not found`);
			return;
		}
		if (!localized) {
			console.warn(`Currency code "${upper}" not found in locale "${l}"`);
			return;
		}

		return { ...baseCurrency, ...localized };
	}

	/**
	 * Checks if a currency exists in the base dataset.
	 * @param code - ISO 4217 currency code
	 * @returns True if currency exists
	 */
	hasCurrency(code: string): boolean {
		return code.toUpperCase() in this.baseMap;
	}

	/**
	 * Gets all currency codes used in a given country.
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns List of upper-case currency codes
	 * @throws If the country code is not found
	 */
	getCurrenciesByCountry(countryCode: CountryCode): CurrencyCode[] {
		const upper = countryCode.toUpperCase();
		const currencies = this.countryCurrencyMap[upper];
		if (!currencies) {
			throw new Error(`Country code "${upper}" not found`);
		}
		return currencies.map((c) => c.toUpperCase());
	}

	/**
	 * Retrieves all currency data objects for a given country.
	 * @param locale - Target locale code
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns List of localized currency objects
	 */
	getCountryCurrencyData(locale: string, countryCode: CountryCode): Currency[] {
		const currencyCodes = this.getCurrenciesByCountry(countryCode);
		return currencyCodes.map((code) => this.getCurrency(locale, code)).filter(Boolean) as Currency[];
	}

	/**
	 * Returns the primary currency code for a given country.
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns Primary currency code (first in the country’s list)
	 */
	getPrimaryCurrencyByCountry(countryCode: CountryCode): CurrencyCode {
		const currencies = this.getCurrenciesByCountry(countryCode);
		return currencies[0];
	}

	/**
	 * Checks whether a country uses multiple currencies.
	 * @param countryCode - ISO 3166-1 alpha-2 country code
	 * @returns True if more than one currency is used
	 */
	hasMultipleCurrencies(countryCode: CountryCode): boolean {
		const currencies = this.getCurrenciesByCountry(countryCode);
		return currencies.length > 1;
	}

	/**
	 * Returns all supported country codes in upper case.
	 * @returns Array of country codes
	 */
	getSupportedCountryCodes(): CountryCode[] {
		return Object.keys(this.countryCurrencyMap).map((c) => c.toUpperCase());
	}

	/**
	 * Returns all countries that use a given currency.
	 * @param currencyCode - ISO 4217 currency code
	 * @returns Array of country codes that use the currency
	 */
	getCountriesByCurrency(currencyCode: CurrencyCode): CountryCode[] {
		const upper = currencyCode.toUpperCase();
		return Object.entries(this.countryCurrencyMap)
			.filter(([_, currencies]) => currencies.map((c) => c.toUpperCase()).includes(upper))
			.map(([country]) => country.toUpperCase());
	}

	/**
	 * Returns a list of all available currency codes.
	 * @returns Array of ISO 4217 codes in upper case
	 */
	getCurrencyCodes(): CurrencyCode[] {
		return Object.keys(this.baseMap).map((c) => c.toUpperCase());
	}

	/**
	 * Returns all locales provided in initialization.
	 * @returns Array of locale codes
	 */
	getAvailableLocales(): LocaleCode[] {
		return Object.keys(this.locales);
	}

	/**
	 * Checks whether a locale is supported by the library.
	 * @param locale - Locale code (e.g., "fr-CA")
	 * @returns True if locale is supported
	 */
	isLocaleSupported(locale: string): boolean {
		const root = locale.split("-")[0];
		return this.supportedLocales.has(root);
	}
}
