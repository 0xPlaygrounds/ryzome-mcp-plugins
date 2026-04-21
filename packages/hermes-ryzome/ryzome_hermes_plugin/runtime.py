from __future__ import annotations

import argparse
import json
import os
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

DEFAULT_RYZOME_API_URL = "https://api.ryzome.ai"
DEFAULT_RYZOME_APP_URL = "https://ryzome.ai"
RYZOME_API_KEY_ENV_VARS = (
    "RYZOME_OPENCLAW_API_KEY",
    "RYZOME_API_KEY",
    "PLUGIN_USER_CONFIG_API_KEY",
)
ALLOWED_KEYS = {"apiKey", "apiUrl", "appUrl"}
RUNNER_ENV_VAR = "RYZOME_HERMES_RUNNER"
CONFIG_PATH_ENV_VAR = "RYZOME_HERMES_CONFIG_PATH"


@dataclass(frozen=True)
class ResolvedConfig:
    api_key: str | None
    api_url: str
    app_url: str


def default_config_path() -> Path:
    override = os.getenv(CONFIG_PATH_ENV_VAR)
    if override:
        return Path(override).expanduser()
    return Path.home() / ".hermes" / "ryzome.json"


def _assert_allowed_keys(config: Mapping[str, Any]) -> None:
    unknown = sorted(set(config.keys()) - ALLOWED_KEYS)
    if unknown:
        joined = ", ".join(unknown)
        raise ValueError(f"ryzome config has unknown keys: {joined}")


def _resolve_env_placeholders(value: str) -> str:
    resolved = value
    while "${" in resolved:
        start = resolved.find("${")
        end = resolved.find("}", start + 2)
        if end == -1:
            break
        env_name = resolved[start + 2 : end]
        env_value = os.getenv(env_name)
        if not env_value:
            raise ValueError(f"Environment variable {env_name} is not set")
        resolved = f"{resolved[:start]}{env_value}{resolved[end + 1:]}"
    return resolved


def load_raw_config(path: Path | None = None) -> dict[str, Any]:
    config_path = path or default_config_path()
    if not config_path.exists():
        return {}

    raw = json.loads(config_path.read_text(encoding="utf8"))
    if not isinstance(raw, dict):
        raise ValueError("ryzome config must be a JSON object")
    _assert_allowed_keys(raw)
    return raw


def save_raw_config(config: Mapping[str, Any], path: Path | None = None) -> Path:
    _assert_allowed_keys(config)
    target = path or default_config_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(dict(config), indent=2) + "\n", encoding="utf8")
    return target


def resolve_api_key_from_env() -> tuple[str | None, str | None]:
    for env_var in RYZOME_API_KEY_ENV_VARS:
        value = os.getenv(env_var)
        if isinstance(value, str) and value.strip():
            return value.strip(), f"environment ({env_var})"
    return None, None


def parse_config(raw: Mapping[str, Any] | None) -> ResolvedConfig:
    config = dict(raw or {})
    if config:
        _assert_allowed_keys(config)

    api_key: str | None
    raw_api_key = config.get("apiKey")
    if isinstance(raw_api_key, str) and raw_api_key.strip():
        try:
            api_key = _resolve_env_placeholders(raw_api_key.strip())
        except ValueError:
            api_key = None
    else:
        api_key, _ = resolve_api_key_from_env()

    raw_api_url = config.get("apiUrl")
    raw_app_url = config.get("appUrl")
    api_url = (
        raw_api_url.strip()
        if isinstance(raw_api_url, str) and raw_api_url.strip()
        else DEFAULT_RYZOME_API_URL
    )
    app_url = (
        raw_app_url.strip()
        if isinstance(raw_app_url, str) and raw_app_url.strip()
        else DEFAULT_RYZOME_APP_URL
    )

    return ResolvedConfig(api_key=api_key, api_url=api_url, app_url=app_url)


def resolve_api_key_status(raw: Mapping[str, Any] | None) -> tuple[str | None, str | None]:
    api_key, source = resolve_api_key_from_env()
    if api_key:
        return api_key, source

    config = dict(raw or {})
    raw_api_key = config.get("apiKey")
    if isinstance(raw_api_key, str) and raw_api_key.strip():
        try:
            return _resolve_env_placeholders(raw_api_key.strip()), "config"
        except ValueError:
            return None, None

    return None, None


def is_configured() -> bool:
    try:
        raw = load_raw_config()
        return bool(parse_config(raw).api_key)
    except Exception:
        return False


def _mask_secret(value: str) -> str:
    if len(value) <= 8:
        return "****"
    return f"{value[:4]}...{value[-4:]}"


def resolve_runner_command(plugin_version: str) -> list[str]:
    del plugin_version

    override = os.getenv(RUNNER_ENV_VAR)
    if override:
        return shlex.split(override)

    bundled_runner = Path(__file__).resolve().parent / "_runner.js"
    if bundled_runner.exists():
        return ["node", str(bundled_runner)]

    dev_runner = Path(__file__).resolve().parents[1] / "dist" / "runner.js"
    if dev_runner.exists():
        return ["node", str(dev_runner)]

    raise RuntimeError(
        "Could not find a Ryzome Hermes runner. Run "
        "`pnpm --filter @ryzome-ai/hermes-ryzome build` from the repo, or set "
        "RYZOME_HERMES_RUNNER to a command that runs the runner."
    )


def run_node_tool(tool_name: str, args: Mapping[str, Any], plugin_version: str) -> dict[str, Any]:
    raw_config = load_raw_config()
    resolved = parse_config(raw_config)
    if not resolved.api_key:
        return {
            "ok": False,
            "error": {
                "name": "ConfigError",
                "message": (
                    "Ryzome API key not configured. Run `hermes ryzome setup --key <api-key>` "
                    "or set `RYZOME_API_KEY`."
                ),
            },
        }

    payload = {
        "toolName": tool_name,
        "params": dict(args),
        "config": {
            "apiKey": resolved.api_key,
            "apiUrl": resolved.api_url,
            "appUrl": resolved.app_url,
        },
    }

    command = resolve_runner_command(plugin_version)
    completed = subprocess.run(
        command,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=False,
    )

    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()
    if not stdout:
        return {
            "ok": False,
            "error": {
                "name": "RunnerError",
                "message": stderr or "Ryzome Hermes runner produced no output.",
            },
        }

    try:
        result = json.loads(stdout)
    except json.JSONDecodeError:
        return {
            "ok": False,
            "error": {
                "name": "RunnerError",
                "message": "Ryzome Hermes runner returned invalid JSON.",
                "stdout": stdout,
                "stderr": stderr,
            },
        }

    if completed.returncode != 0 and result.get("ok") is not False:
        return {
            "ok": False,
            "error": {
                "name": "RunnerError",
                "message": stderr or "Ryzome Hermes runner exited with a non-zero status.",
                "stdout": stdout,
            },
        }

    return result


def setup_cli_parser(subparser: argparse.ArgumentParser) -> None:
    commands = subparser.add_subparsers(dest="ryzome_command")

    setup = commands.add_parser("setup", help="Configure the Ryzome plugin")
    setup.add_argument("--key", dest="key", help="Ryzome API key")
    setup.add_argument("--api-url", dest="api_url", help="Ryzome API URL")
    setup.add_argument("--app-url", dest="app_url", help="Ryzome App URL")

    commands.add_parser("status", help="Show the current Ryzome plugin status")


def _prompt_with_default(prompt: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    response = input(f"{prompt}{suffix}: ").strip()
    return response or (default or "")


def _handle_setup(args: argparse.Namespace) -> None:
    non_interactive = bool(args.key)
    if not non_interactive and not sys.stdin.isatty():
        print(
            "Error: No TTY available for interactive prompts. Pass the key directly: "
            "hermes ryzome setup --key <api-key>"
        )
        return

    current = load_raw_config()
    existing = parse_config(current)

    api_key = args.key.strip() if isinstance(args.key, str) and args.key.strip() else ""
    if not api_key and not non_interactive:
        api_key = _prompt_with_default("Ryzome API key")

    if not api_key:
        print("No key provided. Ryzome remains unconfigured.")
        return

    api_url = ""
    app_url = ""
    if isinstance(args.api_url, str) and args.api_url.strip():
        api_url = args.api_url.strip()
    elif not non_interactive:
        api_url = _prompt_with_default("API URL", existing.api_url)

    if isinstance(args.app_url, str) and args.app_url.strip():
        app_url = args.app_url.strip()
    elif not non_interactive:
        app_url = _prompt_with_default("App URL", existing.app_url)

    next_config = dict(current)
    next_config["apiKey"] = api_key
    if api_url:
        next_config["apiUrl"] = api_url
    if app_url:
        next_config["appUrl"] = app_url

    config_path = save_raw_config(next_config)
    resolved = parse_config(next_config)

    print("Ryzome configured.")
    print(f"Config: {config_path}")
    print(f"Key: {_mask_secret(api_key)}")
    print(f"API: {resolved.api_url}")
    print(f"App: {resolved.app_url}")


def _handle_status() -> None:
    config_path = default_config_path()
    try:
        raw = load_raw_config(config_path)
        resolved = parse_config(raw)
        api_key, source = resolve_api_key_status(raw)
    except Exception as exc:
        print(f"Ryzome configuration error: {exc}")
        print(f"Config path: {config_path}")
        return

    if not api_key:
        print("Ryzome is not configured.")
        print("Run `hermes ryzome setup` or set `RYZOME_API_KEY`.")
        print(f"Config path: {config_path}")
        return

    print(f"Ryzome is configured ({source}).")
    print(f"Config path: {config_path}")
    print(f"Key: {_mask_secret(api_key)}")
    print(f"API: {resolved.api_url}")
    print(f"App: {resolved.app_url}")


def handle_cli_command(args: argparse.Namespace) -> None:
    command = getattr(args, "ryzome_command", None)
    if command == "setup":
        _handle_setup(args)
        return
    if command == "status":
        _handle_status()
        return

    print("Usage: hermes ryzome <setup|status>")
