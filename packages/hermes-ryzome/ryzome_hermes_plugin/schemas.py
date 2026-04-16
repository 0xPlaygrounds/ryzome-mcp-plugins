from __future__ import annotations

import json
from pathlib import Path
from typing import Any

MANIFEST_PATH = Path(__file__).with_name("tool_manifest.json")


def load_tool_schemas() -> list[dict[str, Any]]:
    raw = json.loads(MANIFEST_PATH.read_text(encoding="utf8"))
    if not isinstance(raw, list):
        raise ValueError("tool manifest must be a JSON array")
    return raw


TOOL_SCHEMAS = load_tool_schemas()
