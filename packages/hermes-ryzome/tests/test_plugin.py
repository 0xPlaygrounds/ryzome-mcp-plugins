from __future__ import annotations

import argparse
import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from ryzome_hermes_plugin import register
from ryzome_hermes_plugin.runtime import CONFIG_PATH_ENV_VAR, handle_cli_command
from ryzome_hermes_plugin.schemas import TOOL_SCHEMAS
from ryzome_hermes_plugin.tools import create_tool_handler


class FakeContext:
    def __init__(self) -> None:
        self.tools: list[dict[str, object]] = []
        self.cli_commands: list[dict[str, object]] = []

    def register_tool(self, **kwargs: object) -> None:
        self.tools.append(kwargs)

    def register_cli_command(self, **kwargs: object) -> None:
        self.cli_commands.append(kwargs)


class HermesPluginTests(unittest.TestCase):
    def test_register_uses_generated_tool_schemas(self) -> None:
        context = FakeContext()

        with patch("ryzome_hermes_plugin.is_configured", return_value=True):
            register(context)

        self.assertEqual(len(context.tools), len(TOOL_SCHEMAS))
        self.assertEqual(
            [tool["name"] for tool in context.tools],
            [schema["name"] for schema in TOOL_SCHEMAS],
        )
        self.assertEqual(len(context.cli_commands), 1)
        self.assertEqual(context.cli_commands[0]["name"], "ryzome")

    def test_tool_handler_promotes_json_text_into_data(self) -> None:
        handler = create_tool_handler("list_ryzome_documents", "0.0.0")

        with patch(
            "ryzome_hermes_plugin.tools.run_node_tool",
            return_value={
                "ok": True,
                "content": [{"type": "text", "text": '{"count": 2, "documents": []}'}],
            },
        ):
            payload = json.loads(handler({}, task_id="session-1"))

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["count"], 2)
        self.assertEqual(payload["text"], '{"count": 2, "documents": []}')

    def test_tool_handler_keeps_plaintext_messages(self) -> None:
        handler = create_tool_handler("create_ryzome_canvas", "0.0.0")

        with patch(
            "ryzome_hermes_plugin.tools.run_node_tool",
            return_value={
                "ok": True,
                "content": [{"type": "text", "text": "Canvas created: **Plan**"}],
            },
        ):
            payload = json.loads(handler({}, task_id="session-2"))

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["message"], "Canvas created: **Plan**")

    def test_setup_cli_writes_json_config(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "ryzome.json"
            args = argparse.Namespace(
                ryzome_command="setup",
                key="rz_test_key",
                api_url="https://api.example.test",
                app_url="https://app.example.test",
            )

            stdout = io.StringIO()
            with patch.dict(os.environ, {CONFIG_PATH_ENV_VAR: str(config_path)}):
                with redirect_stdout(stdout):
                    handle_cli_command(args)

            saved = json.loads(config_path.read_text(encoding="utf8"))
            self.assertEqual(saved["apiKey"], "rz_test_key")
            self.assertEqual(saved["apiUrl"], "https://api.example.test")
            self.assertEqual(saved["appUrl"], "https://app.example.test")
            self.assertIn("Ryzome configured.", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
