from __future__ import annotations

import json
import os
import shlex
import subprocess
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

    api_key, _ = resolve_api_key_from_env()
    if not api_key:
        raw_api_key = config.get("apiKey")
        if isinstance(raw_api_key, str) and raw_api_key.strip():
            try:
                api_key = _resolve_env_placeholders(raw_api_key.strip())
            except ValueError:
                api_key = None

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
                    "Ryzome API key not configured. Set `RYZOME_API_KEY` or create "
                    "`~/.hermes/ryzome.json`."
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


def describe_configuration() -> dict[str, Any]:
    config_path = default_config_path()
    try:
        raw = load_raw_config(config_path)
        resolved = parse_config(raw)
        api_key, source = resolve_api_key_status(raw)
    except Exception as exc:
        return {
            "configured": False,
            "config_path": str(config_path),
            "error": str(exc),
        }

    return {
        "configured": bool(api_key),
        "config_path": str(config_path),
        "api_key_source": source,
        "masked_api_key": _mask_secret(api_key) if api_key else None,
        "api_url": resolved.api_url,
        "app_url": resolved.app_url,
    }
