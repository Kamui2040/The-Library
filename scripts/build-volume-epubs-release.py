#!/usr/bin/env python3
"""Build Volume 1 EPUBs and promote them only after official EPUBCheck passes."""

from __future__ import annotations

import importlib.util
import os
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORE_BUILDER = ROOT / "scripts/build-volume-epubs.py"
FINAL_OUTPUT = ROOT / "output/epub"
TEMP_ROOT = ROOT / "tmp/epubs"


def load_core_builder():
    spec = importlib.util.spec_from_file_location("telanas_epub_core", CORE_BUILDER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the core EPUB builder")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def epubcheck_command(path: Path) -> list[str]:
    executable = shutil.which("epubcheck")
    if executable:
        return [executable, str(path)]

    jar = os.environ.get("EPUBCHECK_JAR")
    if jar and Path(jar).is_file():
        return ["java", "-jar", jar, str(path)]

    raise RuntimeError(
        "Official EPUBCheck is required. Install epubcheck or set EPUBCHECK_JAR "
        "to the official validator JAR."
    )


def main() -> None:
    builder = load_core_builder()
    filenames = [config["filename"] for config in builder.LOCALES.values()]

    TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=TEMP_ROOT, prefix="release-") as temporary_root:
        temporary_root_path = Path(temporary_root)
        staged_output = temporary_root_path / "output"
        staged_work = temporary_root_path / "work"
        staged_output.mkdir(parents=True, exist_ok=True)
        staged_work.mkdir(parents=True, exist_ok=True)

        builder.OUTPUT_DIR = staged_output
        builder.TMP_DIR = staged_work
        # The core builder performs its own structural validation. Official
        # EPUBCheck is deliberately deferred until the finished staged files
        # have their real .epub filenames.
        builder.run_epubcheck = lambda path, required: None
        builder.main()

        staged_files = [staged_output / filename for filename in filenames]
        for path in staged_files:
            if not path.is_file() or path.suffix.lower() != ".epub":
                raise RuntimeError(f"Missing staged EPUB release candidate: {path}")
            subprocess.run(epubcheck_command(path), cwd=ROOT, check=True)

        FINAL_OUTPUT.mkdir(parents=True, exist_ok=True)
        for staged in staged_files:
            final = FINAL_OUTPUT / staged.name
            os.replace(staged, final)
            print(f"Validated and built {final.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
