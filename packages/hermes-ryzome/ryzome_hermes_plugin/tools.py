from __future__ import annotations

import json
from typing import Any, Callable

from .runtime import run_node_tool


def _try_parse_json(text: str) -> Any | None:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _adapt_success(result: dict[str, Any]) -> dict[str, Any]:
    content = result.get("content", [])
    if not isinstance(content, list):
        return {
            "ok": False,
            "error": {
                "name": "RunnerError",
                "message": "Ryzome Hermes runner returned malformed content.",
            },
        }

    text_content = None
    for item in content:
        if isinstance(item, dict) and item.get("type") == "text":
            candidate = item.get("text")
            if isinstance(candidate, str):
                text_content = candidate
                break

    payload: dict[str, Any] = {
        "ok": True,
        "content": content,
    }

    if text_content is None:
        return payload

    payload["text"] = text_content
    parsed = _try_parse_json(text_content)
    if parsed is None:
        payload["message"] = text_content
    else:
        payload["data"] = parsed

    return payload


def create_tool_handler(tool_name: str, plugin_version: str) -> Callable[[dict[str, Any]], str]:
    def handler(args: dict[str, Any], **kwargs: Any) -> str:
        del kwargs
        try:
            result = run_node_tool(tool_name, args, plugin_version)
            if result.get("ok") is True:
                return json.dumps(_adapt_success(result))
            return json.dumps(
                {
                    "ok": False,
                    "error": result.get("error", {"message": "Unknown runner error."}),
                }
            )
        except Exception as exc:
            return json.dumps(
                {
                    "ok": False,
                    "error": {
                        "name": exc.__class__.__name__,
                        "message": str(exc),
                    },
                }
            )

    handler.__name__ = f"handle_{tool_name}"
    return handler
