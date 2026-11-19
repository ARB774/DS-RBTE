"""Compatibility wrapper for the Node-based mentor documentation builder."""

from pathlib import Path
import subprocess
import sys


script = Path(__file__).with_suffix(".mjs")
raise SystemExit(subprocess.run(["node", str(script), *sys.argv[1:]], check=False).returncode)
