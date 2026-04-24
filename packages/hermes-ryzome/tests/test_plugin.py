from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from ryzome_hermes_plugin import register
from ryzome_hermes_plugin import runtime
from ryzome_hermes_plugin.runtime import RUNNER_ENV_VAR, parse_config, resolve_runner_command
from ryzome_hermes_plugin.schemas import TOOL_SCHEMAS
from ryzome_hermes_plugin.tools import create_tool_handler


class FakeContext:
    def __init__(self) -> None:
        self.tools: list[dict[str, object]] = []
        self.commands: list[dict[str, object]] = []

    def register_tool(self, **kwargs: object) -> None:
        self.tools.append(kwargs)

    def register_cli_command(self, **kwargs: object) -> None:  # pragma: no cover
        raise AssertionError("Hermes Ryzome plugin should not register a CLI command")

    def register_command(
        self,
        name: str,
        handler: object,
        description: str = "",
        args_hint: str = "",
    ) -> None:
        self.commands.append(
            {
                "name": name,
                "handler": handler,
                "description": description,
                "args_hint": args_hint,
            }
        )


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
        for tool in context.tools:
            self.assertEqual(tool["requires_env"], ["RYZOME_API_KEY"])
        self.assertEqual(len(context.commands), 1)
        self.assertEqual(context.commands[0]["name"], "ryzome-status")

    def test_registered_status_command_reports_configuration(self) -> None:
        context = FakeContext()
        register(context)

        with patch(
            "ryzome_hermes_plugin.describe_configuration",
            return_value={
                "configured": True,
                "config_path": "/tmp/ryzome.json",
                "api_key_source": "environment (RYZOME_API_KEY)",
                "masked_api_key": "rz_t...1234",
                "api_url": "https://api.ryzome.ai",
                "app_url": "https://ryzome.ai",
            },
        ):
            status = context.commands[0]["handler"]("")

        self.assertIn("Ryzome is configured", status)
        self.assertIn("rz_t...1234", status)

    def test_parse_config_prefers_environment_variable(self) -> None:
        with patch.dict(os.environ, {"RYZOME_API_KEY": "rz_env_key"}, clear=False):
            resolved = parse_config({})

        self.assertEqual(resolved.api_key, "rz_env_key")
        self.assertEqual(resolved.api_url, "https://api.ryzome.ai")
        self.assertEqual(resolved.app_url, "https://ryzome.ai")

    def test_parse_config_reads_json_style_user_config(self) -> None:
        resolved = parse_config(
            {
                "apiKey": "rz_config_key",
                "apiUrl": "https://api.example.test",
                "appUrl": "https://app.example.test",
            }
        )

        self.assertEqual(resolved.api_key, "rz_config_key")
        self.assertEqual(resolved.api_url, "https://api.example.test")
        self.assertEqual(resolved.app_url, "https://app.example.test")

    def test_parse_config_supports_env_placeholders_in_json_style_user_config(self) -> None:
        with patch.dict(os.environ, {"RYZOME_SECRET": "rz_placeholder_key"}, clear=False):
            resolved = parse_config({"apiKey": "${RYZOME_SECRET}"})

        self.assertEqual(resolved.api_key, "rz_placeholder_key")

    def test_parse_config_ignores_unset_placeholder_and_falls_back_to_env(self) -> None:
        with patch.dict(os.environ, {"RYZOME_API_KEY": "rz_env_fallback"}, clear=False):
            resolved = parse_config({"apiKey": "${MISSING_VAR}"})

        self.assertEqual(resolved.api_key, "rz_env_fallback")

    def test_parse_config_rejects_unknown_keys(self) -> None:
        with self.assertRaises(ValueError):
            parse_config({"unexpected": True})

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


class ResolveRunnerCommandTests(unittest.TestCase):
    def _make_fake_package(self, tmp: Path) -> Path:
        pkg_dir = tmp / "ryzome_hermes_plugin"
        pkg_dir.mkdir()
        fake_runtime = pkg_dir / "runtime.py"
        fake_runtime.write_text("")
        return fake_runtime

    def test_env_override_wins(self) -> None:
        with patch.dict(os.environ, {RUNNER_ENV_VAR: "custom-runner --flag"}):
            self.assertEqual(
                resolve_runner_command("1.0.0"),
                ["custom-runner", "--flag"],
            )

    def test_prefers_bundled_runner(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fake_runtime = self._make_fake_package(Path(tmp).resolve())
            bundled = fake_runtime.parent / "_runner.js"
            bundled.write_text("// bundled")

            with patch.object(runtime, "__file__", str(fake_runtime)), patch.dict(os.environ, {}):
                os.environ.pop(RUNNER_ENV_VAR, None)
                self.assertEqual(
                    resolve_runner_command("1.0.0"),
                    ["node", str(bundled)],
                )

    def test_falls_back_to_dev_dist_runner(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_resolved = Path(tmp).resolve()
            fake_runtime = self._make_fake_package(tmp_resolved)
            dev_runner = tmp_resolved / "dist" / "runner.js"
            dev_runner.parent.mkdir()
            dev_runner.write_text("// dev")

            with patch.object(runtime, "__file__", str(fake_runtime)), patch.dict(os.environ, {}):
                os.environ.pop(RUNNER_ENV_VAR, None)
                self.assertEqual(
                    resolve_runner_command("1.0.0"),
                    ["node", str(dev_runner)],
                )

    def test_raises_when_no_runner_available(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            fake_runtime = self._make_fake_package(Path(tmp).resolve())

            with patch.object(runtime, "__file__", str(fake_runtime)), patch.dict(os.environ, {}):
                os.environ.pop(RUNNER_ENV_VAR, None)
                with self.assertRaises(RuntimeError) as ctx:
                    resolve_runner_command("1.0.0")
                self.assertIn(RUNNER_ENV_VAR, str(ctx.exception))
                self.assertIn("build", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
