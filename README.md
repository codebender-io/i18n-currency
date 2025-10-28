# @codebender-io/i18n-currency

[![npm version](https://img.shields.io/npm/v/@codebender-io/i18n-currency?label=npm)](https://www.npmjs.com/package/@codebender-io/i18n-currency)
[![License](https://img.shields.io/badge/license-Apache-2.0-blue.svg)](LICENSE)
[![CI](https://github.com/codebender-io/i18n-currency/actions/workflows/ci.yml/badge.svg)](https://github.com/codebender-io/i18n-currency/actions)  
Maintained by **CodeBender** — website: https://codebender.io · GitHub: https://github.com/codebender-io

---

## What is this?

`@codebender-io/i18n-currency` is a small, focused utility library that provides:

- base ISO-4217 currency metadata (codes, symbols, decimal digits, subunit info),
- localized currency names and subunit names for multiple locales,
- convenient lookup utilities by locale and by country.

It is intended for server and client (Node >=18 / ESM) usage and designed in TypeScript with full types.

---

## Install

```bash
# npm
npm install @codebender-io/i18n-currency

# pnpm
pnpm add @codebender-io/i18n-currency

# yarn
yarn add @codebender-io/i18n-currency
```

---

## Quick example

```ts
import { CurrencyLibrary } from "@codebender-io/i18n-currency";
// or for CJS require:
// const { CurrencyLibrary } = require("@codebender-io/i18n-currency");

import enLocales from "@codebender-io/i18n-currency/locales/en.json" assert { type: "json" };

const lib = new CurrencyLibrary({ locales: { en: enLocales }, fallbackLocale: "en" });

const usd = lib.getCurrency("en-US", "USD");
console.log(usd?.name); // "US Dollar" (for the provided locale data)
```

> Note: This package expects you to provide localized `locales` when constructing `CurrencyLibrary`. The library includes base currency metadata bundled in `dist/data/base-currencies.json` and country mappings in `dist/data/country-currencies.json`. Provide locale JSON maps for translated names.

---

## API

### Types (summary)

```ts
export interface CurrencyBase {
	code: string;
	numeric_code: string;
	symbol: string;
	symbol_native: string;
	decimal_digits: number;
	rounding: number;
	subunit_to_unit: number;
	countries: string[]; // ISO 3166-1 alpha-2 codes
	name_native: string;
	subunit_name_native: string;
}

export interface CurrencyLocalized {
	name: string;
	name_plural: string;
	subunit_name: string;
	subunit_name_plural: string;
}

export type Currency = CurrencyBase & CurrencyLocalized;
export type CurrencyCode = string;
export type CurrencyBaseMap = Record<CurrencyCode, CurrencyBase>;
export type CurrencyMap = Record<CurrencyCode, Currency>;
export type LocaleCode = string;
export type LocaleCurrencyMap = Record<LocaleCode, CurrencyMap>;
export type CountryCode = string;
export type CountryCurrencyMap = Record<CountryCode, CurrencyCode[]>;
```

### `new CurrencyLibrary({ locales, fallbackLocale = "en" })`

- `locales: LocaleCurrencyMap` — mapping of locale keys (e.g., `en`, `fr`) to localized currency translations.
- `fallbackLocale?: string` — fallback locale root (defaults to `"en"`). Throws if resolved fallback is not present in `locales`.

### Methods

- `getMap(locale: string): CurrencyMap`  
  Returns a merged map of base currency data + localized fields for the best-match locale (root language fallback).

- `getList(locale: string): Currency[]`  
  Returns an array of all localized currency objects for the locale.

- `getCurrency(locale: string, code: string): Currency | undefined`  
  Returns a single localized currency object or `undefined` if not found.

- `hasCurrency(code: string): boolean`  
  Returns `true` if the currency code exists in base data.

- `getCurrenciesByCountry(countryCode: string): CurrencyCode[]`  
  Returns a list of currency codes used by the country (throws if country not found).

- `getCountryCurrencyData(locale: string, countryCode: string): Currency[]`  
  Returns the localized currency objects for the currencies used by `countryCode`.

- `getPrimaryCurrencyByCountry(countryCode: string): CurrencyCode`  
  The first currency code listed for the country.

- `hasMultipleCurrencies(countryCode: string): boolean`  
  `true` when the country uses multiple currencies.

- `getSupportedCountryCodes(): CountryCode[]`  
  All supported country codes (upper case).

- `getCountriesByCurrency(currencyCode: CurrencyCode): CountryCode[]`  
  Countries that use a specified currency.

- `getCurrencyCodes(): CurrencyCode[]`  
  All available ISO 4217 codes.

- `getAvailableLocales(): LocaleCode[]`  
  Returns locales provided in the initialization `locales` argument.

- `isLocaleSupported(locale: string): boolean`  
  Checks if locale root is supported.

---

## Locale JSON shape (example)

A locale map should be an object where top-level keys are currency codes and values provide localized fields:

```json
{
	"USD": {
		"name": "US Dollar",
		"name_plural": "US Dollars",
		"subunit_name": "cent",
		"subunit_name_plural": "cents"
	},
	"EUR": {
		"name": "Euro",
		"name_plural": "Euros",
		"subunit_name": "cent",
		"subunit_name_plural": "cents"
	}
}
```

You can provide multiple locale roots:

```ts
const locales = {
	en: require("@codebender-io/i18n-currency/locales/en.json"),
	fr: require("@codebender-io/i18n-currency/locales/fr.json"),
};
```

---

## ESM / CJS usage

The package ships both ESM and CommonJS builds. Use `import` for modern projects and `require()` for older environments.

```ts
import { CurrencyLibrary } from "@codebender-io/i18n-currency";
```

```js
const { CurrencyLibrary } = require("@codebender-io/i18n-currency");
```

---

## Publishing notes

- Scoped packages default to private on npm. To publish publicly use:
    ```bash
    npm publish --access public
    ```
- Ensure you are logged into an npm user that has publish access to `@codebender-io`.

---

## Contribution

Contributions welcome! Please open issues or PRs on GitHub: https://github.com/codebender-io/i18n-currency

Suggested workflow:

1. Fork repository
2. Create feature branch
3. Run `pnpm install`
4. Run `pnpm run build` and tests (if available)
5. Open PR and describe changes

---

## License

Apache-2.0 — see `LICENSE` file.

---

## Contact & Links

- Website: https://codebender.io
- GitHub: https://github.com/codebender-io
- npm org: https://www.npmjs.com/org/codebender-io
- LinkedIn: https://www.linkedin.com/company/codebender-io
- X: https://x.com/codebender_io

---
