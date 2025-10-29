import { createDefaultEsmPreset } from "ts-jest";

const defaultEsmPreset = createDefaultEsmPreset();

/** @type {import("jest").Config} **/
const config = {
	...defaultEsmPreset,
	preset: "ts-jest",
	testEnvironment: "node",
	testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],
	moduleFileExtensions: ["ts", "js", "json", "node"],
	coverageProvider: "v8",
	extensionsToTreatAsEsm: [".ts"],
	moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
};

export default config;
