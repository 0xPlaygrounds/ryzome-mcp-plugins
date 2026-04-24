from __future__ import annotations

import logging
from typing import Any

from .runtime import describe_configuration, is_configured
from .schemas import TOOL_SCHEMAS
from .tools import create_tool_handler

__version__ = "1.0.1"

LOGGER = logging.getLogger(__name__)


def _handle_status(_raw_args: str) -> str:
    info = describe_configuration()
    if info.get("error"):
        return (
            f"Ryzome configuration error: {info['error']}\n"
            f"Config path: {info['config_path']}"
        )

    if not info.get("configured"):
        return (
            "Ryzome is not configured.\n"
            "Set `RYZOME_API_KEY` (recommended) or create `~/.hermes/ryzome.json`.\n"
            f"Config path: {info['config_path']}"
        )

    source = info.get("api_key_source") or "unknown source"
    return (
        f"Ryzome is configured ({source}).\n"
        f"Config path: {info['config_path']}\n"
        f"Key: {info['masked_api_key']}\n"
        f"API: {info['api_url']}\n"
        f"App: {info['app_url']}"
    )


def register(ctx: Any) -> None:
    if not is_configured():
        LOGGER.info(
            "Ryzome Hermes plugin loaded without an API key. Set `RYZOME_API_KEY` "
            "or create `~/.hermes/ryzome.json` to enable tools."
        )

    for schema in TOOL_SCHEMAS:
        ctx.register_tool(
            name=schema["name"],
            toolset="ryzome",
            schema=schema,
            handler=create_tool_handler(schema["name"], __version__),
            check_fn=is_configured,
            requires_env=["RYZOME_API_KEY"],
        )

    ctx.register_command(
        "ryzome-status",
        handler=_handle_status,
        description="Show Ryzome plugin configuration status.",
    )
