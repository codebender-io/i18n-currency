# 📘 CurrencyLibrary Usage Examples

This document demonstrates how to use the **CurrencyLibrary** class to access currency and localization data.

---

## 1. Importing and Initializing the Library

```ts
import { CurrencyLibrary } from "@codebender-io/i18n-currency";
import base from "./data/base.json" with { type: "json" };
import en from "@codebender-io/i18n-currency/locales/en.json" assert { type: "json" };
import fr from "@codebender-io/i18n-currency/locales/fr.json" assert { type: "json" };

// Initialize with available locales
const lib = new CurrencyLibrary({
	locales: { en, fr },
	fallbackLocale: "en",
});
```

---

## 2. Get Localized Currency Data

### Get a Specific Currency

```ts
const usd = lib.getCurrency("en-US", "usd");
console.log(usd?.name); // "US Dollar"
```

### Get All Currencies for a Locale

```ts
const currencies = lib.getList("fr");
console.log(currencies.length); // e.g., 180
```

### Check if a Currency Exists

```ts
console.log(lib.hasCurrency("JPY")); // true
```

---

## 3. Country-Based Lookups

### Get All Currencies Used by a Country

```ts
const currencies = lib.getCurrenciesByCountry("US");
console.log(currencies); // ["USD"]
```

### Get Localized Currency Data for a Country

```ts
const countryData = lib.getCountryCurrencyData("fr", "CA");
console.log(countryData[0].name); // "Dollar canadien"
```

### Get Primary Currency of a Country

```ts
const mainCurrency = lib.getPrimaryCurrencyByCountry("JP");
console.log(mainCurrency); // "JPY"
```

### Check if a Country Has Multiple Currencies

```ts
console.log(lib.hasMultipleCurrencies("CH")); // true (Switzerland: CHF, EUR)
```

---

## 4. Supported Data Utilities

### List Supported Countries

```ts
const countries = lib.getSupportedCountryCodes();
console.log(countries.slice(0, 5)); // ["US", "CA", "GB", "FR", "DE"]
```

### List Supported Currency Codes

```ts
const codes = lib.getCurrencyCodes();
console.log(codes.length); // e.g., 180
```

### Get Countries Using a Specific Currency

```ts
const euroCountries = lib.getCountriesByCurrency("EUR");
console.log(euroCountries); // ["FR", "DE", "IT", "ES", ...]
```

### List Available Locales

```ts
console.log(lib.getAvailableLocales()); // ["en", "fr"]
```

### Check Locale Support

```ts
console.log(lib.isLocaleSupported("fr-CA")); // true
console.log(lib.isLocaleSupported("xx-YY")); // false
```

---

## 5. Locale Matching

### Get Best Match for a Locale

```ts
console.log(lib.getLocaleBestMatch("en-US")); // "en"
console.log(lib.getLocaleBestMatch("fr-CA")); // "fr"
console.log(lib.getLocaleBestMatch("xx-YY")); // "en" (fallback)
```

---

## ✅ Summary

| Function                                      | Description                                 |
| --------------------------------------------- | ------------------------------------------- |
| `getCurrency(locale, code)`                   | Get localized currency info                 |
| `getList(locale)`                             | List all currencies for a locale            |
| `getCurrenciesByCountry(countryCode)`         | Get currency codes by country               |
| `getCountryCurrencyData(locale, countryCode)` | Get localized currency data by country      |
| `getPrimaryCurrencyByCountry(countryCode)`    | Get country’s main currency                 |
| `hasMultipleCurrencies(countryCode)`          | Check if a country uses multiple currencies |
| `getCountriesByCurrency(code)`                | Get all countries using a currency          |
| `isLocaleSupported(locale)`                   | Verify if a locale is supported             |

---

© 2025 CurrencyLibrary Example Guide
