from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from backend.app.config import (
    MODEL_API_KEY, META_API_TIMEOUT_SECONDS, META_MAX_TOOL_CALLS,
    META_MAX_TOOL_TURNS, META_MODEL_BASE_URL, META_MODEL_ID,
)
from backend.app.schemas import DecisionInput, ConstraintReport, DecisionNarrative, ToolTraceItem
from backend.app.services.tool_registry import execute_tool, schemas_for_request
from backend.app.services.narrative import validate_narrative

logger = logging.getLogger("antevorta.agent")

ROOT_DIR = Path(__file__).resolve().parents[3]
SYSTEM_PROMPT = (ROOT_DIR / "prompts" / "decision_agent_system.md").read_text(encoding="utf-8")


class MetaAgentError(RuntimeError):
    pass


def _clean_json_content(content: str) -> str:
    """Strip markdown code fence blocks if returned by the model."""
    stripped = content.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def run_meta_agent(request: DecisionInput, report: ConstraintReport) -> tuple[DecisionNarrative, list[ToolTraceItem], str]:
    if not MODEL_API_KEY:
        raise MetaAgentError("MODEL_API_KEY is not configured")
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise MetaAgentError("OpenAI-compatible SDK is not installed; install backend/requirements.txt") from exc

    client = OpenAI(
        api_key=MODEL_API_KEY,
        base_url=META_MODEL_BASE_URL,
        timeout=META_API_TIMEOUT_SECONDS,
        max_retries=1,
    )
    tools = schemas_for_request(request)
    trace: list[ToolTraceItem] = []
    tool_call_count = 0
    called_tool = False
    messages: list[dict[str, Any]] = [
        {"role": "developer", "content": SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps({
            "decision": request.model_dump(),
            "deterministic_constraint_report": report.model_dump(),
            "required_output_schema": DecisionNarrative.model_json_schema(),
            "instruction": "Use compare_options and list_unknowns tools before producing your JSON narrative. Use exact option IDs.",
        }, ensure_ascii=False)},
    ]

    for _turn in range(META_MAX_TOOL_TURNS):
        try:
            response = client.chat.completions.create(
                model=META_MODEL_ID,
                messages=messages,
                tools=tools,
                tool_choice="auto",
                temperature=0.2,
                max_tokens=1800,
            )
        except Exception as exc:
            # Safe logging: do not expose headers, secrets or full payload
            logger.warning("Meta Model API call failed on turn %d: %s", _turn, type(exc).__name__)
            raise MetaAgentError(f"Meta Model API request failed ({type(exc).__name__})") from exc

        if not response.choices:
            raise MetaAgentError("Meta Model API returned no choices")
        message = response.choices[0].message
        calls = message.tool_calls or []

        if not calls:
            # Model responded with final message
            if called_tool and message.content:
                cleaned = _clean_json_content(message.content)
                try:
                    narrative = DecisionNarrative.model_validate_json(cleaned)
                    ok, reason = validate_narrative(narrative, request, report)
                    if ok:
                        trace.append(ToolTraceItem(
                            tool="scenario_verifier",
                            status="completed",
                            detail="Required option coverage and unsupported-probability checks passed.",
                        ))
                        usage = getattr(response, "usage", None)
                        usage_note = f"Meta API call completed; model={META_MODEL_ID}; tool_calls={tool_call_count}; usage_reported={usage is not None}."
                        return narrative, trace, usage_note
                    trace.append(ToolTraceItem(tool="scenario_verifier", status="blocked", detail=reason))
                except Exception as exc:
                    logger.debug("Failed to validate early completion JSON: %s", type(exc).__name__)
            break

        # Replay the assistant tool-call message before tool responses
        assistant_message = message.model_dump(exclude_none=True)
        assistant_message.setdefault("content", message.content)
        messages.append(assistant_message)

        for call in calls:
            if tool_call_count >= META_MAX_TOOL_CALLS:
                trace.append(ToolTraceItem(tool=call.function.name, status="blocked", detail="Tool-call budget reached."))
                raise MetaAgentError("Tool-call budget reached before a valid final answer")
            tool_call_count += 1
            name = call.function.name
            try:
                args = json.loads(call.function.arguments or "{}")
                if not isinstance(args, dict):
                    raise ValueError("Tool arguments must be a JSON object")
                result = execute_tool(name, args, request, report)
                called_tool = True
                trace.append(ToolTraceItem(
                    tool=name,
                    status="completed",
                    detail="Executed against validated request data and deterministic constraint results.",
                ))
                content = json.dumps(result, ensure_ascii=False)
            except Exception as exc:
                trace.append(ToolTraceItem(
                    tool=name,
                    status="failed",
                    detail=f"Tool execution rejected ({type(exc).__name__}).",
                ))
                content = json.dumps({"error": "Tool call rejected. Use only listed option IDs and valid JSON arguments."})
            messages.append({"role": "tool", "tool_call_id": call.id, "content": content})

    # A final JSON structured output request is allowed only if the agent actually used tools.
    # Without real tool use, we return a fallback rather than misrepresent an agentic run.
    if called_tool:
        try:
            # Attempt with response_format json_schema first, fallback to json_object if provider doesn't support json_schema
            try:
                response = client.chat.completions.create(
                    model=META_MODEL_ID,
                    messages=messages + [{
                        "role": "user",
                        "content": "Now return only one JSON object conforming exactly to DecisionNarrative. Use only tool results for calculations, cover each option once, and make no numerical probability claims.",
                    }],
                    response_format={"type": "json_schema", "json_schema": {
                        "name": "decision_narrative",
                        "schema": DecisionNarrative.model_json_schema(),
                    }},
                    temperature=0.1,
                    max_tokens=1800,
                )
            except Exception:
                # Fallback to json_object mode
                response = client.chat.completions.create(
                    model=META_MODEL_ID,
                    messages=messages + [{
                        "role": "user",
                        "content": "Now return only one JSON object conforming exactly to DecisionNarrative. Use only tool results for calculations, cover each option once, and make no numerical probability claims.",
                    }],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=1800,
                )

            raw_content = response.choices[0].message.content or ""
            cleaned = _clean_json_content(raw_content)
            narrative = DecisionNarrative.model_validate_json(cleaned)
            ok, reason = validate_narrative(narrative, request, report)
            if ok:
                trace.append(ToolTraceItem(
                    tool="scenario_verifier",
                    status="completed",
                    detail="Required option coverage and unsupported-probability checks passed.",
                ))
                return narrative, trace, f"Meta API call completed; model={META_MODEL_ID}; tool_calls={tool_call_count}."
            trace.append(ToolTraceItem(tool="scenario_verifier", status="blocked", detail=reason))
        except Exception as exc:
            trace.append(ToolTraceItem(
                tool="scenario_verifier",
                status="failed",
                detail=f"Final output validation failed ({type(exc).__name__}).",
            ))
    raise MetaAgentError("The model did not complete a valid tool-assisted analysis; deterministic fallback used")
