import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateReleaseBundle } from "./lib/release-bundle.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const replace = args.includes("--replace");
const allowReleaseContent = args.includes("--allow-release-content");
const positional = args.filter((arg) => !arg.startsWith("--"));

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const readExistingSha = async (targetPath) => {
  try {
    return sha256(await readFile(targetPath));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

if (positional.length !== 1) {
  console.error(
    "FAIL: usage: node scripts/import-release-bundle.mjs <bundle-directory> [--apply] [--replace] [--allow-release-content]",
  );
  process.exitCode = 1;
} else {
  try {
    const result = await validateReleaseBundle(positional[0], { allowReleaseContent });
    const plan = [];

    for (const file of result.files) {
      const targetPath = path.resolve(repoRoot, ...file.target.split("/"));
      const relativeToRepo = path.relative(repoRoot, targetPath);
      if (!relativeToRepo || relativeToRepo.startsWith("..") || path.isAbsolute(relativeToRepo)) {
        throw new Error(`Target escapes repository root: ${file.target}`);
      }

      const existingSha = await readExistingSha(targetPath);
      const unchanged = existingSha === file.sha256;
      const replacement = Boolean(existingSha && !unchanged);
      plan.push({ ...file, targetPath, existingSha, unchanged, replacement });
    }

    if (!apply) {
      const writes = plan.filter((item) => !item.unchanged).length;
      const replacements = plan.filter((item) => item.replacement).length;
      const unchanged = plan.length - writes;
      const replacementNote = replacements > 0 ? ` ${replacements} would require --replace when applying.` : "";
      console.log(
        `PASS: dry-run ${result.bundle.bundleId}; ${writes} file(s) would be written, ${unchanged} already match.${replacementNote}`,
      );
    } else {
      const blockedReplacement = plan.find((item) => item.replacement && !replace);
      if (blockedReplacement) {
        throw new Error(`Target already exists with different content; use --replace explicitly: ${blockedReplacement.target}`);
      }

      let writes = 0;
      for (const item of plan) {
        if (item.unchanged) continue;
        await mkdir(path.dirname(item.targetPath), { recursive: true });
        await copyFile(item.absolutePath, item.targetPath);
        const importedSha = await readExistingSha(item.targetPath);
        if (importedSha !== item.sha256) {
          throw new Error(`Post-copy SHA-256 mismatch: ${item.target}`);
        }
        writes += 1;
      }
      console.log(`PASS: imported ${result.bundle.bundleId}; wrote ${writes} file(s). Run npm run validate before acceptance.`);
    }
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
