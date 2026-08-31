import path from "node:path";
import { validateReleaseBundle } from "./lib/release-bundle.mjs";

const args = process.argv.slice(2);
const allowReleaseContent = args.includes("--allow-release-content");
const positional = args.filter((arg) => !arg.startsWith("--"));

if (positional.length !== 1) {
  console.error("FAIL: usage: node scripts/validate-release-bundle.mjs <bundle-directory> [--allow-release-content]");
  process.exitCode = 1;
} else {
  try {
    const result = await validateReleaseBundle(positional[0], { allowReleaseContent });
    console.log(
      `PASS: validated release bundle ${result.bundle.bundleId} (${result.bundle.state}, ${result.files.length} file(s)) at ${path.resolve(positional[0])}`,
    );
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
