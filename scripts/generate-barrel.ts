import glob from "fast-glob";
import { writeFileSync } from "node:fs";
import { relative } from "node:path";

const outputFile = "src/index.ts";

async function generateBarrel() {
	const files = await glob("src/**/*.{ts,js}", {
		ignore: ["src/index.ts", "**/*.test.ts", "**/__tests__/**"],
	});

	const exports = files.map((file) => {
		const path = "./" + relative("src", file).replaceAll(/\.(ts|js)$/g, "");
		return `export * from "${path}.js";`;
	});

	writeFileSync(outputFile, exports.join("\n") + "\n");
	console.log(`✅ Barrel file generated at ${outputFile}`);
}

try {
	await generateBarrel();
} catch (error) {
	console.error("❌ Failed to generate barrel file:", error);
	process.exit(1);
}
