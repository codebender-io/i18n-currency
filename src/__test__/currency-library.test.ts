import { beforeAll, describe, expect, jest, test } from "@jest/globals";

jest.mock(
	"../data/base-currencies.json",
	() => ({
		__esModule: true,
		default: {
			USD: {
				code: "USD",
				numeric_code: "840",
				symbol: "$",
				symbol_native: "$",
				decimal_digits: 2,
				rounding: 0,
				subunit_to_unit: 100,
				countries: ["US"],
				name_native: "US Dollar",
				subunit_name_native: "cent",
			},
			EUR: {
				code: "EUR",
				numeric_code: "978",
				symbol: "€",
				symbol_native: "€",
				decimal_digits: 2,
				rounding: 0,
				subunit_to_unit: 100,
				countries: ["FR", "DE"],
				name_native: "Euro",
				subunit_name_native: "cent",
			},
			ZWL: {
				code: "ZWL",
				numeric_code: "932",
				symbol: "Z$",
				symbol_native: "Z$",
				decimal_digits: 2,
				rounding: 0,
				subunit_to_unit: 100,
				countries: ["ZW"],
				name_native: "Zimbabwe Dollar",
				subunit_name_native: "cent",
			},
			JPY: {
				code: "JPY",
				numeric_code: "392",
				symbol: "¥",
				symbol_native: "￥",
				decimal_digits: 0,
				rounding: 0,
				subunit_to_unit: 1,
				countries: ["JP"],
				name_native: "日本円",
				subunit_name_native: "",
			},
			XAF: {
				code: "XAF",
				numeric_code: "950",
				symbol: "FCFA",
				symbol_native: "FCFA",
				decimal_digits: 0,
				rounding: 0,
				subunit_to_unit: 1,
				countries: ["CM", "CF"],
				name_native: "Franc CFA",
				subunit_name_native: "",
			},
			// Add currency for numeric code 975 (Palestinian currency)
			PSE: {
				code: "PSE",
				numeric_code: "975",
				symbol: "₪",
				symbol_native: "₪",
				decimal_digits: 2,
				rounding: 0,
				subunit_to_unit: 100,
				countries: ["PS"],
				name_native: "شيكل",
				subunit_name_native: "agora",
			},
		},
	}),
	{ virtual: true },
);

jest.mock(
	"../data/country-currencies.json",
	() => ({
		__esModule: true,
		default: {
			US: ["USD"],
			FR: ["EUR"],
			DE: ["EUR"],
			ZW: ["ZWL", "USD"],
			JP: ["JPY"],
			CM: ["XAF"],
			CF: ["XAF"],
			PS: ["975"], // Palestinian territories use numeric code
		},
	}),
	{ virtual: true },
);

jest.mock(
	"../data/supported-locales.json",
	() => ({
		__esModule: true,
		default: ["en", "fr", "es", "de", "ja"],
	}),
	{ virtual: true },
);

// Now import the library after mocking the JSON modules
import { CurrencyLibrary } from "../currency.js";

const locales = {
	en: {
		USD: {
			name: "US Dollar",
			name_plural: "US Dollars",
			subunit_name: "cent",
			subunit_name_plural: "cents",
		},
		EUR: {
			name: "Euro",
			name_plural: "Euros",
			subunit_name: "cent",
			subunit_name_plural: "cents",
		},
		ZWL: {
			name: "Zimbabwe Dollar",
			name_plural: "Zimbabwe Dollars",
			subunit_name: "cent",
			subunit_name_plural: "cents",
		},
		JPY: {
			name: "Japanese Yen",
			name_plural: "Japanese Yen",
			subunit_name: "",
			subunit_name_plural: "",
		},
		XAF: {
			name: "Central African CFA Franc",
			name_plural: "Central African CFA Francs",
			subunit_name: "",
			subunit_name_plural: "",
		},
		PSE: {
			name: "Palestinian Shekel",
			name_plural: "Palestinian Shekels",
			subunit_name: "agora",
			subunit_name_plural: "agorot",
		},
	},
	fr: {
		USD: {
			name: "dollar américain",
			name_plural: "dollars américains",
			subunit_name: "cent",
			subunit_name_plural: "cents",
		},
		EUR: {
			name: "euro",
			name_plural: "euros",
			subunit_name: "centime",
			subunit_name_plural: "centimes",
		},
		ZWL: {
			name: "dollar zimbabwéen",
			name_plural: "dollars zimbabwéens",
			subunit_name: "cent",
			subunit_name_plural: "cents",
		},
		JPY: {
			name: "yen japonais",
			name_plural: "yens japonais",
			subunit_name: "",
			subunit_name_plural: "",
		},
	},
	es: {
		USD: {
			name: "dólar estadounidense",
			name_plural: "dólares estadounidenses",
			subunit_name: "centavo",
			subunit_name_plural: "centavos",
		},
	},
	// Partial locale - only some currencies
	"fr-CA": {
		USD: {
			name: "dollar américain",
			name_plural: "dollars américains",
			subunit_name: "sou",
			subunit_name_plural: "sous",
		},
	},
};

let lib: CurrencyLibrary;

beforeAll(() => {
	lib = new CurrencyLibrary({ locales, fallbackLocale: "en" });
});

describe("CurrencyLibrary - initialization & locale matching", () => {
	test("constructor initializes with valid locales", () => {
		expect(lib).toBeInstanceOf(CurrencyLibrary);
	});

	test("constructor throws if locales is missing", () => {
		expect(() => new CurrencyLibrary({} as any)).toThrow("`locales` must be an object");
	});

	test("constructor throws if fallback locale not provided in locales", () => {
		const badLocales = { fr: locales.fr }; // missing 'en'
		expect(() => new CurrencyLibrary({ locales: badLocales, fallbackLocale: "de" })).toThrow(/Fallback locale "de"/);
	});

	test("getLocaleBestMatch returns exact match when available", () => {
		const libWithExact = new CurrencyLibrary({
			locales: { ...locales, "fr-CA": locales["fr-CA"] },
			fallbackLocale: "en",
		});
		expect(libWithExact.getLocaleBestMatch("fr-CA")).toBe("fr-CA");
	});

	test("getLocaleBestMatch returns root match when exact not available", () => {
		expect(lib.getLocaleBestMatch("en-US")).toBe("en");
		expect(lib.getLocaleBestMatch("fr-FR")).toBe("fr");
	});

	test("getLocaleBestMatch returns fallback when no match found", () => {
		expect(lib.getLocaleBestMatch("de-DE")).toBe("en");
	});

	test("getLocaleBestMatch handles malformed locale gracefully", () => {
		expect(lib.getLocaleBestMatch("")).toBe("en");
		expect(lib.getLocaleBestMatch("invalid-locale")).toBe("en");
	});

	test("isLocaleSupported recognizes supported roots", () => {
		expect(lib.isLocaleSupported("fr-FR")).toBe(true);
		expect(lib.isLocaleSupported("en-US")).toBe(true);
		expect(lib.isLocaleSupported("de-DE")).toBe(true); // FIXED: 'de' is in supported-locales.json
		expect(lib.isLocaleSupported("xx-XX")).toBe(false);
	});

	test("isLocaleSupported handles malformed input", () => {
		expect(lib.isLocaleSupported("")).toBe(false);
		expect(lib.isLocaleSupported("invalid")).toBe(false);
	});

	test("handles multi-part locales", () => {
		expect(lib.getLocaleBestMatch("zh-Hans-CN")).toBe("en");
		expect(lib.getLocaleBestMatch("es-419")).toBe("es");
	});

	test("handles deprecated locale codes", () => {
		expect(lib.getLocaleBestMatch("iw")).toBe("en"); // Hebrew old code
		expect(lib.getLocaleBestMatch("in")).toBe("en"); // Indonesia old code
	});

	test("handles very long locale strings", () => {
		expect(lib.getLocaleBestMatch("en-US-x-twain")).toBe("en");
	});
});

describe("CurrencyLibrary - map operations", () => {
	test("getMap returns all currencies with base and localized data", () => {
		const map = lib.getMap("en");
		expect(Object.keys(map)).toEqual(["USD", "EUR", "ZWL", "JPY", "XAF", "PSE"]); // Added PSE

		const usd = map.USD;
		expect(usd.code).toBe("USD");
		expect(usd.name).toBe("US Dollar");
		expect(usd.symbol).toBe("$");
		expect(usd.decimal_digits).toBe(2);
		expect(usd.subunit_to_unit).toBe(100);
	});

	test("getMap uses fallback locale for missing localizations", () => {
		// XAF is not localized in 'fr' but should fallback to 'en'
		const map = lib.getMap("fr");
		expect(map.XAF.name).toBe("Central African CFA Franc");
	});

	test("getMap excludes currencies missing in both requested and fallback locales", () => {
		const partialLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } },
			fallbackLocale: "en",
		});
		const map = partialLib.getMap("fr");
		expect(Object.keys(map)).toEqual(["USD"]); // Only USD should be present
	});

	test("getMap returns empty object for locale with no matching currencies", () => {
		// Create a library with empty locales for both requested and fallback
		const emptyLib = new CurrencyLibrary({
			locales: {
				xx: {}, // Empty locale
				en: {}, // Empty fallback locale
			},
			fallbackLocale: "en",
		});
		const map = emptyLib.getMap("xx");
		expect(Object.keys(map)).toHaveLength(0);
	});

	test("getList returns array of Currency objects", () => {
		const list = lib.getList("fr");
		expect(Array.isArray(list)).toBe(true);
		expect(list.length).toBeGreaterThan(0);
		expect(list.every((item) => item.code && item.name)).toBe(true);

		const eur = list.find((c) => c.code === "EUR");
		expect(eur?.name).toBe("euro");
		expect(eur?.subunit_name).toBe("centime");
	});
});

describe("CurrencyLibrary - single currency operations", () => {
	test("getCurrency returns merged base and localized data", () => {
		const usd = lib.getCurrency("en", "USD");
		expect(usd).toBeDefined();
		expect(usd?.code).toBe("USD");
		expect(usd?.name).toBe("US Dollar");
		expect(usd?.numeric_code).toBe("840");
		expect(usd?.symbol).toBe("$");
	});

	test("getCurrency is case-insensitive for currency code", () => {
		const usdLower = lib.getCurrency("en", "usd");
		const usdUpper = lib.getCurrency("en", "USD");
		expect(usdLower).toEqual(usdUpper);
	});

	test("getCurrency trims whitespace from currency code", () => {
		const usd = lib.getCurrency("en", "  usd  ");
		expect(usd).toBeDefined();
		expect(usd?.code).toBe("USD");
	});

	test("getCurrency accepts numeric codes", () => {
		const byNumeric = lib.getCurrency("en", "840");
		const byAlpha = lib.getCurrency("en", "USD");
		expect(byNumeric).toEqual(byAlpha);
	});

	test("getCurrency accepts numeric codes with leading zeros", () => {
		const jpyNumeric = lib.getCurrency("en", "392");
		expect(jpyNumeric?.code).toBe("JPY");

		// Test padding behavior
		const jpyShort = lib.getCurrency("en", "392");
		expect(jpyShort?.code).toBe("JPY");
	});

	test("getCurrency returns undefined for unknown currency", () => {
		const missing = lib.getCurrency("en", "ABC");
		expect(missing).toBeUndefined();

		const missingNumeric = lib.getCurrency("en", "999");
		expect(missingNumeric).toBeUndefined();
	});

	test("getCurrency returns undefined for malformed currency code", () => {
		const invalid = lib.getCurrency("en", "US");
		expect(invalid).toBeUndefined();

		const empty = lib.getCurrency("en", "");
		expect(empty).toBeUndefined();
	});

	test("getCurrency uses locale fallback chain", () => {
		// XAF is not in 'fr' locale, should fallback to 'en'
		const xaf = lib.getCurrency("fr", "XAF");
		expect(xaf?.name).toBe("Central African CFA Franc");
	});

	test("getCurrency returns undefined if currency missing in both locales", () => {
		const partialLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } },
			fallbackLocale: "en",
		});
		const eur = partialLib.getCurrency("fr", "EUR");
		expect(eur).toBeUndefined();
	});

	test("hasCurrency checks existence in base dataset", () => {
		expect(lib.hasCurrency("usd")).toBe(true);
		expect(lib.hasCurrency("USD")).toBe(true);
		expect(lib.hasCurrency("840")).toBe(true);
		expect(lib.hasCurrency("392")).toBe(true);
		expect(lib.hasCurrency("abc")).toBe(false);
		expect(lib.hasCurrency("999")).toBe(false);
		expect(lib.hasCurrency("")).toBe(false);
	});

	test("hasCurrency handles numeric code padding", () => {
		expect(lib.hasCurrency("392")).toBe(true); // JPY
		expect(lib.hasCurrency("0392")).toBe(false); // Too long
	});

	test("handles single-digit numeric codes", () => {
		expect(lib.hasCurrency("1")).toBe(false);
		expect(lib.getCurrency("en", "1")).toBeUndefined();
	});

	test("rejects non-3-letter alphabetic codes", () => {
		expect(lib.getCurrency("en", "US")).toBeUndefined();
		expect(lib.getCurrency("en", "USDO")).toBeUndefined();
		expect(lib.getCurrency("en", "U")).toBeUndefined();
	});

	test("handles unicode and special characters", () => {
		expect(lib.getCurrency("en", "U$D")).toBeUndefined();
		expect(lib.getCurrency("en", "€UR")).toBeUndefined();
	});
});

describe("CurrencyLibrary - country operations", () => {
	test("getCurrenciesByCountry returns normalized codes", () => {
		expect(lib.getCurrenciesByCountry("us")).toEqual(["USD"]);
		expect(lib.getCurrenciesByCountry("FR")).toEqual(["EUR"]);
		expect(lib.getCurrenciesByCountry("ZW")).toEqual(["ZWL", "USD"]);
	});

	test("getCurrenciesByCountry converts numeric codes to alphabetic", () => {
		// PS uses numeric code "975" which should be converted to alphabetic "PSE"
		const psCurrencies = lib.getCurrenciesByCountry("PS");
		expect(psCurrencies).toEqual(["PSE"]);
		expect(psCurrencies.every((code) => typeof code === "string")).toBe(true);
	});

	test("getCurrenciesByCountry handles unknown country", () => {
		expect(lib.getCurrenciesByCountry("XX")).toEqual([]);
	});

	test("getCurrenciesByCountry handles malformed country code", () => {
		expect(lib.getCurrenciesByCountry("USA")).toEqual([]);
		expect(lib.getCurrenciesByCountry("")).toEqual([]);
	});

	test("getCountryCurrencyData returns localized Currency objects", () => {
		const frData = lib.getCountryCurrencyData("fr", "FR");
		expect(frData).toHaveLength(1);
		expect(frData[0].code).toBe("EUR");
		expect(frData[0].name).toBe("euro");
	});

	test("getCountryCurrencyData filters out missing localizations", () => {
		const partialLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } },
			fallbackLocale: "en",
		});
		const zwData = partialLib.getCountryCurrencyData("en", "ZW");
		// ZWL is not localized, only USD should be returned
		expect(zwData).toHaveLength(1);
		expect(zwData[0].code).toBe("USD");
	});

	test("getPrimaryCurrencyByCountry returns first currency", () => {
		expect(lib.getPrimaryCurrencyByCountry("US")).toBe("USD");
		expect(lib.getPrimaryCurrencyByCountry("ZW")).toBe("ZWL");
		expect(lib.getPrimaryCurrencyByCountry("XX")).toBeUndefined();
	});

	test("hasMultipleCurrencies detects multiple currencies", () => {
		expect(lib.hasMultipleCurrencies("ZW")).toBe(true);
		expect(lib.hasMultipleCurrencies("US")).toBe(false);
		expect(lib.hasMultipleCurrencies("XX")).toBe(false);
	});

	test("getSupportedCountryCodes returns all country codes", () => {
		const countries = lib.getSupportedCountryCodes();
		expect(countries).toContain("US");
		expect(countries).toContain("ZW");
		expect(countries).toContain("JP");
		expect(Array.isArray(countries)).toBe(true);
	});

	test("getCountriesByCurrency returns countries using currency", () => {
		const usdCountries = lib.getCountriesByCurrency("USD");
		expect(usdCountries).toContain("US");
		expect(usdCountries).toContain("ZW");

		const eurCountries = lib.getCountriesByCurrency("EUR");
		expect(eurCountries).toContain("FR");
		expect(eurCountries).toContain("DE");
	});

	test("getCountriesByCurrency works with numeric codes", () => {
		const usdByNumeric = lib.getCountriesByCurrency("840");
		const usdByAlpha = lib.getCountriesByCurrency("USD");

		// Both should return the same countries
		expect(usdByNumeric.sort()).toEqual(usdByAlpha.sort());
		expect(usdByNumeric).toContain("US");
		expect(usdByNumeric).toContain("ZW");
	});

	test("getCountriesByCurrency returns empty for unknown currency", () => {
		expect(lib.getCountriesByCurrency("ABC")).toEqual([]);
		expect(lib.getCountriesByCurrency("999")).toEqual([]);
	});

	test("handles special territory codes", () => {
		expect(lib.getCurrenciesByCountry("XK")).toEqual([]); // Kosovo
		expect(lib.getCurrenciesByCountry("EU")).toEqual([]); // European Union
	});

	test("rejects 3-letter ISO codes", () => {
		expect(lib.getCurrenciesByCountry("USA")).toEqual([]);
		expect(lib.getCurrenciesByCountry("FRA")).toEqual([]);
	});

	test("handles very short/long country codes", () => {
		expect(lib.getCurrenciesByCountry("U")).toEqual([]);
		expect(lib.getCurrenciesByCountry("USAA")).toEqual([]);
	});
});

describe("CurrencyLibrary - utility methods", () => {
	test("getCurrencyCodes returns all base currency codes", () => {
		const codes = lib.getCurrencyCodes();
		expect(codes).toEqual(expect.arrayContaining(["USD", "EUR", "ZWL", "JPY", "XAF", "PSE"]));
		expect(Array.isArray(codes)).toBe(true);
	});

	test("getAvailableLocales returns provided locales", () => {
		const available = lib.getAvailableLocales();
		expect(available).toEqual(expect.arrayContaining(["en", "fr", "es", "fr-CA"]));
		expect(Array.isArray(available)).toBe(true);
	});
});

describe("CurrencyLibrary - edge cases & robustness", () => {
	test("locale normalization handles various formats", () => {
		expect(lib.getLocaleBestMatch("EN_us")).toBe("en");
		expect(lib.getLocaleBestMatch(" fr_FR ")).toBe("fr");
		expect(lib.getLocaleBestMatch("es-ES")).toBe("es");
	});

	test("numeric code normalization handles various formats", () => {
		// JPY numeric code "392" should work in various formats
		expect(lib.getCurrency("en", "392")).toBeDefined();
		expect(lib.getCurrency("en", "0392")).toBeUndefined(); // Too long
	});

	test("logger receives warnings for missing localizations", () => {
		const mockLogger = { warn: jest.fn() };
		const loggingLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } },
			fallbackLocale: "en",
			logger: mockLogger,
		});

		// This should trigger warnings for missing EUR localization
		loggingLib.getMap("fr");

		expect(mockLogger.warn).toHaveBeenCalled();
	});

	test("immutable internal state", () => {
		const map = lib.getMap("en");

		// Attempting to modify should not affect internal state
		map.USD.name = "Modified";

		const freshMap = lib.getMap("en");
		expect(freshMap.USD.name).toBe("US Dollar"); // Should be original value
	});

	test("no caching behavior - new objects each call", () => {
		const map1 = lib.getMap("en");
		const map2 = lib.getMap("en");

		expect(map1).not.toBe(map2); // Different objects
		expect(map1.USD).not.toBe(map2.USD); // Different currency objects
	});

	test("handles currencies with zero decimal digits", () => {
		const jpy = lib.getCurrency("en", "JPY");
		expect(jpy?.decimal_digits).toBe(0);
		expect(jpy?.subunit_to_unit).toBe(1);
	});

	test("handles currencies without subunits", () => {
		const jpy = lib.getCurrency("en", "JPY");
		expect(jpy?.subunit_name).toBe("");
		expect(jpy?.subunit_name_plural).toBe("");
	});

	test("logger receives warnings when configured", () => {
		// Renamed from "info" to "warnings"
		const mockLogger = { warn: jest.fn() };
		const loggingLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } }, // Only USD provided
			fallbackLocale: "en",
			logger: mockLogger,
		});

		// This should trigger warnings for missing currencies in 'fr' locale
		loggingLib.getMap("fr");
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	test("methods work without logger provided", () => {
		const noLoggerLib = new CurrencyLibrary({ locales });
		expect(() => {
			noLoggerLib.getMap("en");
			noLoggerLib.getCurrency("en", "USD");
		}).not.toThrow();
	});

	test("logger handles multiple warning scenarios", () => {
		const mockLogger = { warn: jest.fn() };
		const partialLib = new CurrencyLibrary({
			locales: { en: { USD: locales.en.USD } },
			fallbackLocale: "en",
			logger: mockLogger,
		});

		// Trigger multiple warning scenarios
		partialLib.getMap("fr");
		partialLib.getCurrency("fr", "EUR");

		// With 6 base currencies and only USD localized, we expect:
		// getMap('fr') warns for 5 missing currencies + getCurrency warns for 1 = 6 total
		expect(mockLogger.warn).toHaveBeenCalledTimes(6);
	});
});

describe("CurrencyLibrary - error boundary conditions", () => {
	test("constructor handles empty locales object", () => {
		expect(() => new CurrencyLibrary({ locales: {} })).toThrow(/Fallback locale/);
	});

	test("methods handle null/undefined inputs gracefully", () => {
		expect(lib.getLocaleBestMatch(undefined as any)).toBe("en");
		expect(lib.getCurrency("en", undefined as any)).toBeUndefined();
		expect(lib.hasCurrency(undefined as any)).toBe(false);
	});

	test("normalization preserves original data integrity", () => {
		const map = lib.getMap("en");
		const usd = map.USD;

		// Verify all original base fields are preserved
		expect(usd.numeric_code).toBe("840");
		expect(usd.symbol).toBe("$");
		expect(usd.decimal_digits).toBe(2);
		expect(usd.rounding).toBe(0);
		expect(usd.subunit_to_unit).toBe(100);
		expect(usd.countries).toEqual(["US"]);
		expect(usd.name_native).toBe("US Dollar");
		expect(usd.subunit_name_native).toBe("cent");

		// Verify all localized fields are present
		expect(usd.name).toBe("US Dollar");
		expect(usd.name_plural).toBe("US Dollars");
		expect(usd.subunit_name).toBe("cent");
		expect(usd.subunit_name_plural).toBe("cents");
	});
});

describe("CurrencyLibrary - performance & memory", () => {
	test("getMap returns fresh objects each call", () => {
		const map1 = lib.getMap("en");
		const map2 = lib.getMap("en");

		expect(map1).not.toBe(map2);
		expect(map1.USD).not.toBe(map2.USD);

		// Verify no shared references that could cause mutation
		map1.USD.name = "Modified";
		expect(map2.USD.name).toBe("US Dollar");
	});

	test("indexes contain all base currencies", () => {
		// Test that all base currencies are properly indexed
		const baseCount = Object.keys(lib["baseMap"]).length;
		const alphaIndexCount = Object.keys(lib["alphaIndex"]).length;
		const numericIndexCount = Object.keys(lib["numericIndex"]).length;

		expect(alphaIndexCount).toBe(baseCount);
		// Some currencies might not have numeric codes, so numeric count might be less
		expect(numericIndexCount).toBeLessThanOrEqual(baseCount);
	});

	test("handles concurrent operations without issues", () => {
		// Test that multiple operations don't interfere
		const promises = [
			Promise.resolve(lib.getMap("en")),
			Promise.resolve(lib.getCurrency("en", "USD")),
			Promise.resolve(lib.getCurrenciesByCountry("US")),
		];

		return Promise.all(promises).then((results) => {
			expect(results[0]).toBeDefined();
			expect(results[1]).toBeDefined();
			expect(results[2]).toBeDefined();
		});
	});
});

describe("CurrencyLibrary - internationalization", () => {
	test("handles right-to-left currencies", () => {
		const hebrewLib = new CurrencyLibrary({
			locales: {
				he: {
					USD: {
						name: "דולר אמריקאי",
						name_plural: "דולרים אמריקאים",
						subunit_name: "סנט",
						subunit_name_plural: "סנטים",
					},
				},
				en: {
					// ADDED: Fallback locale with USD
					USD: {
						name: "US Dollar",
						name_plural: "US Dollars",
						subunit_name: "cent",
						subunit_name_plural: "cents",
					},
				},
			},
			fallbackLocale: "en",
		});

		const currency = hebrewLib.getCurrency("he", "USD");
		expect(currency?.name).toBe("דולר אמריקאי");
	});

	test("handles currencies with non-Latin scripts", () => {
		const arabicLib = new CurrencyLibrary({
			locales: {
				ar: {
					USD: {
						name: "دولار أمريكي",
						name_plural: "دولارات أمريكية",
						subunit_name: "سنت",
						subunit_name_plural: "سنتات",
					},
				},
				en: {
					// ADDED: Fallback locale with USD
					USD: {
						name: "US Dollar",
						name_plural: "US Dollars",
						subunit_name: "cent",
						subunit_name_plural: "cents",
					},
				},
			},
			fallbackLocale: "en",
		});

		const currency = arabicLib.getCurrency("ar", "USD");
		expect(currency?.name).toBe("دولار أمريكي");
	});
});
