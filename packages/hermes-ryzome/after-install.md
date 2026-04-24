# Hermes Ryzome plugin installed

Hermes should prompt for `RYZOME_API_KEY` during install because this plugin declares it in `plugin.yaml` via `requires_env`.

If you skipped that prompt, configure the plugin with either:

```bash
export RYZOME_API_KEY=***
```

or `~/.hermes/ryzome.json`.

Inside a Hermes session, you can run:

```text
/ryzome-status
```

Notes:

- `node` must be on `PATH`
- config is stored at `~/.hermes/ryzome.json` if you use the JSON file path
- the plugin also respects `RYZOME_OPENCLAW_API_KEY` and `PLUGIN_USER_CONFIG_API_KEY`