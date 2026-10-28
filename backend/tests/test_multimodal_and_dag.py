import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.scenario_dag import build_decision_dag
from backend.app.services.future_self import generate_future_self_reflection
from backend.app.services.multimodal import parse_spoken_dictation, generate_visual_scenario
from backend.app.schemas import FutureSelfRequest, VoiceTranscribeRequest, VisualScenarioRequest
from test_constraint_engine import make_request

client = TestClient(app)


def test_decision_dag_construction():
    req = make_request()
    dag = build_decision_dag(req)
    assert len(dag.nodes) >= 6
    assert len(dag.edges) >= 5

    node_types = {n.type for n in dag.nodes}
    assert "decision" in node_types
    assert "option" in node_types
    assert "resource" in node_types or "bottleneck" in node_types
    assert "outcome" in node_types
    assert "experiment" in node_types

    # Coordinates valid
    for n in dag.nodes:
        assert n.x > 0
        assert n.y > 0


def test_dag_api_endpoint():
    req_dict = make_request().model_dump()
    res = client.post("/api/dag", json=req_dict)
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data
    assert "critical_bottlenecks" in data
    assert "recommended_path" in data


def test_future_self_reflection_deterministic_synthesis():
    req = make_request()
    fs_req = FutureSelfRequest(
        option_id="option_job",
        decision=req,
        time_horizon_years=3,
        tone="reflective",
    )
    res = generate_future_self_reflection(fs_req)
    assert res.option_id == "option_job"
    assert res.horizon_years == 3
    assert "3-Year Future Self" in res.perspective
    assert len(res.dialogue_transcript) > 50
    assert len(res.hardest_tradeoff) > 10
    assert "simulated reflection" in res.disclaimer.lower()


def test_future_self_api_endpoint():
    req_dict = make_request().model_dump()
    payload = {
        "option_id": "option_job",
        "decision": req_dict,
        "time_horizon_years": 5,
        "tone": "analytical",
    }
    res = client.post("/api/future-self", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["horizon_years"] == 5
    assert "dialogue_transcript" in data


def test_multimodal_spoken_dictation_parsing():
    text = "I need to choose between a full time software engineering job in Kathmandu with 40 hours a week and 30000 monthly cost versus starting an AI SaaS where I need 45 hours weekly."
    req = VoiceTranscribeRequest(audio_text=text)
    res = parse_spoken_dictation(req)
    assert len(res.extracted_question) > 5
    assert len(res.parsed_input.options) >= 2

    # Check API
    api_res = client.post("/api/multimodal/transcribe", json={"audio_text": text})
    assert api_res.status_code == 200
    data = api_res.json()
    assert "parsed_input" in data
    assert len(data["parsed_input"]["options"]) >= 2


def test_multimodal_visual_scenario_generation():
    v_req = VisualScenarioRequest(
        option_id="option_job",
        option_name="Kathmandu AI Engineer",
        description="Working at a tech agency in Lalitpur.",
        horizon_months=12,
    )
    res = generate_visual_scenario(v_req)
    assert res.option_id == "option_job"
    assert res.image_url.startswith("data:image/svg+xml;base64,")
    assert "Kathmandu" in res.prompt_used

    # Check API
    api_res = client.post("/api/multimodal/visualize", json={
        "option_id": "option_job",
        "option_name": "Kathmandu AI Engineer",
        "description": "Tech agency role.",
        "horizon_months": 12,
    })
    assert api_res.status_code == 200
    data = api_res.json()
    assert "image_url" in data
    assert "prompt_used" in data
