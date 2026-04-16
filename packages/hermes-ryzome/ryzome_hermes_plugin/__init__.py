from __future__ import annotations

import logging
from typing import Any

from .runtime import handle_cli_command, is_configured, setup_cli_parser
from .schemas import TOOL_SCHEMAS
from .tools import create_tool_handler

__version__ = "0.1.0"

LOGGER = logging.getLogger(__name__)


def register(ctx: Any) -> None:
    if not is_configured():
        LOGGER.info(
            "Ryzome Hermes plugin loaded without an API key. Run `hermes ryzome setup` "
            "or set `RYZOME_API_KEY` to enable tools."
        )

    for schema in TOOL_SCHEMAS:
        ctx.register_tool(
            name=schema["name"],
            toolset="ryzome",
            schema=schema,
            handler=create_tool_handler(schema["name"], __version__),
            check_fn=is_configured,
        )

    ctx.register_cli_command(
        name="ryzome",
        help="Configure and inspect the Ryzome Hermes plugin",
        setup_fn=setup_cli_parser,
        handler_fn=handle_cli_command,
    )
