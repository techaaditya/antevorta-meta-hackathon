import json
import sys
from types import SimpleNamespace
from backend.app.schemas import DecisionNarrative
from backend.app.services.constraint_engine import assess_decision
from backend.app.services.narrative import build_fallback_narrative
from backend.app.services import meta_agent
from test_constraint_engine import make_request


class FakeMessage:
    def __init__(self, content=None, tool_calls=None):
        self.content = content
        self.tool_calls = tool_calls or []

    def model_dump(self, exclude_none=True):
        return {
            "role": "assistant",
            "content": self.content,
            "tool_calls": [
                {"id": call.id, "type": "function", "function": {"name": call.function.name, "arguments": call.function.arguments}}
                for call in self.tool_calls
            ],
        }


class FakeCompletions:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return next(self.responses)


class FakeOpenAI:
    responses = []
    instance = None

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.completions = FakeCompletions(self.responses)
        self.chat = SimpleNamespace(completions=self.completions)
        FakeOpenAI.instance = self


def response(message):
    return SimpleNamespace(choices=[SimpleNamespace(message=message)], usage=SimpleNamespace(prompt_tokens=20, completion_tokens=20))


def test_agent_runs_allowlisted_tools_and_validates_final_output(monkeypatch):
    request = make_request()
    report = assess_decision(request)
    calls = [
        SimpleNamespace(id="call-1", function=SimpleNamespace(name="compare_options", arguments="{}")),
        SimpleNamespace(id="call-2", function=SimpleNamespace(name="list_unknowns", arguments="{}")),
    ]
    narrative = build_fallback_narrative(request, report).model_copy(update={
        "summary": "This is a model-generated conditional comparison based on the tool results."
    })
    FakeOpenAI.responses = [
        response(FakeMessage(tool_calls=calls)),
        response(FakeMessage(content=narrative.model_dump_json())),
    ]
    monkeypatch.setitem(sys.modules, "openai", SimpleNamespace(OpenAI=FakeOpenAI))
    monkeypatch.setattr(meta_agent, "MODEL_API_KEY", "test-key")
    monkeypatch.setattr(meta_agent, "META_MAX_TOOL_TURNS", 4)
    monkeypatch.setattr(meta_agent, "META_MAX_TOOL_CALLS", 8)

    actual, trace, status = meta_agent.run_meta_agent(request, report)
    assert isinstance(actual, DecisionNarrative)
    assert {item.tool for item in trace if item.status == "completed"} >= {"compare_options", "list_unknowns", "scenario_verifier"}
    assert "tool_calls=2" in status
    assert FakeOpenAI.instance.kwargs["api_key"] == "test-key"
    assert len(FakeOpenAI.instance.completions.calls) == 2
    assert FakeOpenAI.instance.completions.calls[0]["tool_choice"] == "auto"
    assert FakeOpenAI.instance.completions.calls[1]["messages"][2]["role"] == "assistant"
    assert FakeOpenAI.instance.completions.calls[1]["messages"][3]["role"] == "tool"
