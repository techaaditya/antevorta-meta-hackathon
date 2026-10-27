# Meta Model API Implementation Notes

**Verified against official Meta Model API pages on 27 October 2026.** Always recheck the live docs/dashboard before final submission; hosted model IDs and availability may change.

## Current configuration in this kit

- Base URL: `https://api.meta.ai/v1`
- Auth header: `Authorization: Bearer $MODEL_API_KEY`
- Default model: `muse-spark-1.3`
- Protocol: OpenAI-compatible Python SDK using Chat Completions for function/tool calling.

Official references:
- Overview: https://dev.meta.ai/docs/overview
- Quickstart: https://dev.meta.ai/docs/quickstart
- Chat completions recipe: https://dev.meta.ai/docs/cookbook/quickstart-chat-completions
- Tool/function calling: https://dev.meta.ai/docs/cookbook/tool-function-calling
- Structured output: https://dev.meta.ai/docs/cookbook/structured-output
- API reference: https://dev.meta.ai/docs/api-reference
- Model list: https://dev.meta.ai/docs/models

## First smoke test

Run after `.env` is configured:

```bash
python scripts/check_meta_api.py
```

The script sends a minimal request and prints the model response and token usage, but never prints the API key. If it fails, check key validity, account/billing, model access, package version, and the official docs before changing the project architecture.

## Tool calling rules to preserve

- Tool definitions use `{"type":"function","function":{"name":...,"parameters":...}}`.
- Tool call arguments arrive as JSON strings; parse and validate them.
- If the assistant response has tool calls, append the full assistant message to the conversation, then add one `tool` message per call with its exact `tool_call_id`.
- Support multiple tool calls and repeat the loop only within a fixed budget.
- Leave `tool_choice` at `auto`; current Meta cookbook notes non-auto values are rejected for this route.
- Chat Completions accepts function tools; built-in `web_search` is a Responses API tool. This kit does not mix the two APIs in one call path.
- Do not assume every optional OpenAI SDK parameter is supported; stay close to the official recipe.

## Model choice

Muse Spark 1.3 is the default in the current official model list and is described as intended for agentic workflows and coding. The kit uses it for a bounded tool-calling agent. Do not use `muse-spark-open-1026` unless intentionally using the Baseten-hosted open-weight route; the participant guide specifically calls out that partner-specific identifier. The official API model ID and partner endpoint model ID are not interchangeable.

## Costs and reliability

- Claim the event credits and ensure the billing page shows them.
- Add a spend-limit alert.
- Keep each demo run short; cap tool turns and output size.
- Record model ID and usage statistics, not raw user prompts.
- Retry transient provider failures only with a bounded retry policy; don't retry invalid requests (4xx) blindly.
- If the provider is unavailable, keep a working fallback path that clearly labels itself as deterministic.
