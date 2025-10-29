/**
 * Represents the base (non-localized) currency information.
 * This data is locale-independent and comes from ISO 4217 standards.
 */
export interface CurrencyBase {
	/** ISO 4217 alphabetic currency code (e.g., "USD", "EUR") */
	code: string;
	/** ISO 4217 numeric currency code (e.g., "840" for USD) */
	numeric_code: string;
	/** Common currency symbol (e.g., "$", "€") */
	symbol: string;
	/** Native symbol as used locally (may differ by locale) */
	symbol_native: string;
	/** Number of decimal digits typically used (e.g., 2 for USD) */
	decimal_digits: number;
	/** Rounding increment for this currency */
	rounding: number;
	/** Conversion factor of subunit to unit (e.g., 100 for cents to dollars) */
	subunit_to_unit: number;
	/** ISO 3166-1 alpha-2 country codes that use this currency */
	countries: string[];
	/** Native language name of the currency */
	name_native: string;
	/** Native name for the currency's subunit (e.g., "cent") */
	subunit_name_native: string;
}

/**
 * Represents localized currency information (translated names and labels).
 * This data varies by locale and provides user-facing text.
 */
export interface CurrencyLocalized {
	/** Localized name of the currency (e.g., "US Dollar") */
	name: string;
	/** Localized plural form (e.g., "US Dollars") */
	name_plural: string;
	/** Localized subunit name (e.g., "cent") */
	subunit_name: string;
	/** Localized plural subunit name (e.g., "cents") */
	subunit_name_plural: string;
}

/** Combined structure of base and localized currency info. */
export type Currency = CurrencyBase & CurrencyLocalized;

/** ISO 4217 alphabetic code, e.g., "USD". */
export type CurrencyCode = string;
/** Map of currency code to its base data. */
export type CurrencyBaseMap = Record<CurrencyCode, CurrencyBase>;
/** Map of currency code to its localized data. */
export type CurrencyLocalizedMap = Record<CurrencyCode, CurrencyLocalized>;
/** Map of currency code to fully localized data. */
export type CurrencyMap = Record<CurrencyCode, Currency>;

/** BCP-47 locale code, e.g., "en", "fr-CA". */
export type LocaleCode = string;
/** Mapping of locale codes to localized currency maps. */
export type LocaleCurrencyMap = Record<LocaleCode, CurrencyLocalizedMap>;

/** ISO 3166-1 alpha-2 country code, e.g., "US". */
export type CountryCode = string;
/** Mapping of countries to one or more associated currency codes. */
export type CountryCurrencyMap = Record<CountryCode, CurrencyCode[]>;

/**
 * Logger interface: optional, allows consumers to control logging.
 * By default the library will use `console`.
 *
 * NOTE: Library intentionally avoids internal logging to prevent
 * hidden I/O operations that callers might not expect.
 */
export interface Logger {
	warn(...args: unknown[]): void;
	info?: (...args: unknown[]) => void;
}

/**
 * Properties for initializing a CurrencyLibrary instance.
 */
export interface CurrencyLibraryProps {
	/** Map of localized currency data by locale (BCP-47 tags or language roots). */
	locales: LocaleCurrencyMap;
	/** Fallback locale if requested locale is not available. Defaults to "en". */
	fallbackLocale?: LocaleCode;
	/** Optional logger; defaults to console. */
	logger?: Logger;
}
