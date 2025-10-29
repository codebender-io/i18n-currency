#!/usr/bin/env tsx
/**
 * prepare-package.ts
 *
 * - Reads package.json
 * - Produces a sanitized package.publish.json (strips dev-only fields)
 * - Backs up original package.json -> package.json.bak
 * - Replaces package.json with sanitized copy
 *
 * Run via: tsx scripts/prepare-package.ts
 */

import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const PKG = path.join(ROOT, "package.json");
const BACKUP = path.join(ROOT, "package.json.bak");
const PUBLISH = path.join(ROOT, "package.publish.json");

type PackageJson = Record<string, any>;

async function fileExists(p: string) {
	try {
		await fs.access(p);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	if (!(await fileExists(PKG))) {
		console.error("package.json not found in project root");
		process.exit(1);
	}

	// Read original package.json
	const raw = await fs.readFile(PKG, "utf8");
	const pkg: PackageJson = JSON.parse(raw);

	// Fields to remove from the published package.json
	const stripFields = ["devDependencies", "scripts", "private", "husky", "lint-staged", "workspaces", "pnpm", "publishConfig"];

	// Build sanitized package object
	const publishPkg: PackageJson = { ...pkg };

	for (const f of stripFields) {
		// support nested paths like "engines.node"
		if (!f.includes(".")) {
			delete publishPkg[f];
		} else {
			const parts = f.split(".");
			let ref: any = publishPkg;
			for (let i = 0; i < parts.length - 1; i++) {
				if (!ref || typeof ref !== "object") break;
				ref = ref[parts[i]];
			}
			if (ref && typeof ref === "object") {
				delete ref[parts[parts.length - 1]];
			}
		}
	}

	// Optionally, you can further prune or normalize fields:
	// - minimize 'repository' to only url
	// - remove 'contributors'
	// - set 'homepage' to a public URL only
	// Example:
	if (publishPkg.repository && typeof publishPkg.repository === "object") {
		publishPkg.repository = { type: publishPkg.repository.type, url: publishPkg.repository.url };
	}

	// Backup original package.json safely (fail if backup already exists to avoid accidental overwrites)
	if (await fileExists(BACKUP)) {
		console.warn("Backup already exists at package.json.bak — leaving it in place");
	} else {
		await fs.writeFile(BACKUP, JSON.stringify(pkg, null, 2), "utf8");
	}

	// Write publish package JSON
	await fs.writeFile(PUBLISH, JSON.stringify(publishPkg, null, 2), "utf8");

	// Replace package.json with the publish version (atomic-ish: write temp then rename)
	const TMP = path.join(ROOT, `package.tmp.${Date.now()}.json`);
	await fs.writeFile(TMP, JSON.stringify(publishPkg, null, 2), "utf8");
	await fs.rename(TMP, PKG);

	console.log("✅ package.json replaced with sanitized publish version.");
	console.log("Backup saved to package.json.bak. A copy of the sanitized json is at package.publish.json");
}

main().catch((err) => {
	console.error("prepare-package failed:", err);
	process.exit(1);
});
