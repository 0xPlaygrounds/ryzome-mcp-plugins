# Hermes Ryzome plugin installed

Set `RYZOME_API_KEY` or `RYZOME_ACCESS_TOKEN` in your environment or `~/.hermes/.env` before using the tools. Either credential enables the plugin; `/ryzome-status` reports the selected mode.

For example, configure an API key with:

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