// scripts/copy-locales.js
import fs from "fs/promises";
import path from "path";

const SRC = path.resolve(process.cwd(), "src", "locales"); // adjust if your locale path differs
const DEFAULT_TARGET = path.resolve(process.cwd(), "locales"); // default outside dist
const TARGET = process.env.LOCALES_TARGET ? path.resolve(process.cwd(), process.env.LOCALES_TARGET) : DEFAULT_TARGET;

/**
 * Copies and minifies JSON files recursively.
 * Other files are copied as-is.
 */
async function copyDir(src: string, dest: string) {
	await fs.mkdir(dest, { recursive: true });
	const entries = await fs.readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			await copyDir(srcPath, destPath);
		} else if (entry.isFile()) {
			if (entry.name.endsWith(".json")) {
				// Read, parse, and re-stringify compact JSON
				try {
					const content = await fs.readFile(srcPath, "utf8");
					const parsed = JSON.parse(content);
					const minified = JSON.stringify(parsed);
					await fs.writeFile(destPath, minified, "utf8");
					console.log(`Minified JSON → ${destPath}`);
				} catch (err) {
					console.warn(`Failed to minify ${srcPath}:`, err.message);
					await fs.copyFile(srcPath, destPath); // fallback
				}
			} else {
				await fs.copyFile(srcPath, destPath);
				console.log(`Copied → ${destPath}`);
			}
		}
	}
}

async function main() {
	try {
		await fs.access(SRC);
	} catch {
		console.error(`❌ Source locales folder not found: ${SRC}`);
		process.exit(1);
	}

	try {
		await copyDir(SRC, TARGET);
		console.log(`✅ Locales copied & minified from ${SRC} → ${TARGET}`);
	} catch (err) {
		console.error("❌ Failed to copy locales:", err);
		process.exit(2);
	}
}

main();
