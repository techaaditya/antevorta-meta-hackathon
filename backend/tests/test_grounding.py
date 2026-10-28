import pytest
from backend.app.services.grounding import retrieve_grounded_citations, VERIFIED_BENCHMARK_DATABASE
from backend.app.schemas import VerifiedCitation
from test_constraint_engine import make_request


def test_grounded_citations_matches_relevant_decision_domains():
    req = make_request(
        question="Should I relocate to Kathmandu or pursue a startup in Pokhara?",
        options=[
            {
                "id": "option_job",
                "name": "Kathmandu Tech Job",
                "description": "Living and renting in Kathmandu city.",
                "required_hours_per_week": 40.0,
                "upfront_cost_npr": 50000.0,
                "monthly_cost_npr": 35000.0,
            },
            {
                "id": "option_research",
                "name": "Bootstrapped Startup",
                "description": "Bootstrapped venture with 12 months runway.",
                "required_hours_per_week": 50.0,
                "upfront_cost_npr": 100000.0,
                "monthly_cost_npr": 20000.0,
            },
        ],
    )
    citations = retrieve_grounded_citations(req)
    assert len(citations) >= 2
    sources = [c.source_name for c in citations]
    assert any("Kathmandu" in s for s in sources)
    assert any("Startup" in s for s in sources)

    for c in citations:
        assert c.url.startswith("https://")
        assert c.verified is True
        assert len(c.snippet) > 20
        assert "T" in c.retrieval_timestamp


def test_grounded_citations_returns_empty_when_no_verified_matches():
    req = make_request(
        question="Should I buy a blue telescope or a green microscope for backyard stargazing?",
        options=[
            {
                "id": "option_job",
                "name": "Blue Telescope",
                "description": "Astronomical optics instrument.",
                "required_hours_per_week": 5.0,
                "upfront_cost_npr": 15000.0,
                "monthly_cost_npr": 0.0,
            },
            {
                "id": "option_research",
                "name": "Green Microscope",
                "description": "Biological magnification tool.",
                "required_hours_per_week": 5.0,
                "upfront_cost_npr": 12000.0,
                "monthly_cost_npr": 0.0,
            },
        ],
    )
    citations = retrieve_grounded_citations(req)
    # Never invent citations or fake URLs when no verified match exists
    assert citations == []
