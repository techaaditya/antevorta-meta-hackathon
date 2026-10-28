from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OptionInput(StrictModel):
    id: str = Field(pattern=r"^option_[a-z0-9_]+$", min_length=8, max_length=48)
    name: str = Field(min_length=2, max_length=100)
    description: str = Field(default="", max_length=1500)
    required_hours_per_week: float | None = Field(default=None, ge=0, le=168)
    upfront_cost_npr: float | None = Field(default=None, ge=0, le=1_000_000_000)
    monthly_cost_npr: float | None = Field(default=None, ge=0, le=100_000_000)
    prerequisites: list[str] = Field(default_factory=list, max_length=12)
    unknowns: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("prerequisites", "unknowns")
    @classmethod
    def trim_and_bound_strings(cls, value: list[str]) -> list[str]:
        cleaned = [item.strip()[:240] for item in value if item.strip()]
        return cleaned


class DecisionInput(StrictModel):
    question: str = Field(min_length=8, max_length=1200)
    deadline: str | None = Field(default=None, max_length=40)
    horizon_months: int = Field(default=12, ge=1, le=120)
    weekly_maintenance_hours: float | None = Field(default=None, ge=0, le=168)
    existing_commitments_hours: float | None = Field(default=None, ge=0, le=168)
    savings_npr: float | None = Field(default=None, ge=0, le=10_000_000_000)
    monthly_surplus_npr: float | None = Field(default=None, ge=-100_000_000, le=100_000_000)
    options: list[OptionInput] = Field(min_length=2, max_length=3)
    important_unknowns: list[str] = Field(default_factory=list, max_length=20)
    reversible_experiment: str = Field(default="", max_length=1200)
    criteria: list[str] = Field(default_factory=list, max_length=10)

    @field_validator("important_unknowns", "criteria")
    @classmethod
    def clean_list(cls, value: list[str]) -> list[str]:
        return [item.strip()[:240] for item in value if item.strip()]

    @model_validator(mode="after")
    def unique_option_ids_and_names(self):
        ids = [option.id for option in self.options]
        names = [option.name.casefold() for option in self.options]
        if len(ids) != len(set(ids)):
            raise ValueError("Option IDs must be unique.")
        if len(names) != len(set(names)):
            raise ValueError("Option names must be unique.")
        if self.weekly_maintenance_hours is not None and self.existing_commitments_hours is not None:
            if self.weekly_maintenance_hours + self.existing_commitments_hours > 168:
                # This is valid input: it should become a capacity conflict, not a validation error.
                pass
        return self


class OptionAssessment(StrictModel):
    option_id: str
    option_name: str
    overall_status: Literal["FEASIBLE", "CONFLICT", "UNKNOWN"]
    time_status: Literal["FEASIBLE", "CONFLICT", "UNKNOWN"]
    weekly_available_hours: float | None
    required_hours_per_week: float | None
    weekly_headroom_hours: float | None
    money_status: Literal["FEASIBLE", "CONFLICT", "UNKNOWN"]
    projected_available_budget_npr: float | None
    projected_total_cost_npr: float | None
    projected_budget_headroom_npr: float | None
    missing_fields: list[str]
    prerequisites_to_verify: list[str]
    verified_prerequisites: list[str] = Field(default_factory=list)
    runway_months: float | None = None
    breakeven_monthly_surplus_npr: float | None = None
    explanation: str


class ConstraintReport(StrictModel):
    overall_status: Literal["FEASIBLE", "CONFLICT", "UNKNOWN"]
    time_horizon_months: int
    weekly_capacity_hours: float | None
    option_assessments: list[OptionAssessment]
    missing_inputs: list[str]
    important_unknowns: list[str]
    known_facts: list[str] = Field(default_factory=list)
    user_assumptions: list[str] = Field(default_factory=list)
    arithmetic_policy: str = "All displayed quantities come from supplied inputs and deterministic arithmetic. Missing inputs are unknown, never zero."


class OptionNarrative(StrictModel):
    option_id: str
    potential_upside: str = Field(min_length=1, max_length=900)
    main_tradeoff: str = Field(min_length=1, max_length=900)
    conditions_to_make_it_work: list[str] = Field(min_length=1, max_length=6)
    questions_to_resolve: list[str] = Field(default_factory=list, max_length=8)


class DecisionNarrative(StrictModel):
    summary: str = Field(min_length=1, max_length=1600)
    option_analyses: list[OptionNarrative] = Field(min_length=2, max_length=3)
    cross_option_insights: list[str] = Field(default_factory=list, max_length=8)
    reversible_experiment: str = Field(min_length=1, max_length=900)
    questions_before_deciding: list[str] = Field(default_factory=list, max_length=10)
    caveat: str = "These are conditional scenarios, not predictions or a decision made on your behalf."


class ToolTraceItem(StrictModel):
    tool: str
    status: Literal["completed", "blocked", "failed"]
    detail: str = Field(max_length=500)


class ClarificationPrompt(StrictModel):
    id: str
    field_target: str
    option_id: str | None = None
    question: str
    why_it_matters: str
    suggested_action: str
    suggested_patch: dict[str, Any] = Field(default_factory=dict)


class ClarificationReport(StrictModel):
    clarity_score: int = Field(ge=0, le=100)
    critical_gaps_count: int
    prompts: list[ClarificationPrompt]


class VerifiedCitation(StrictModel):
    source_name: str
    url: str
    retrieval_timestamp: str
    snippet: str
    verified: bool
    query: str


class VerificationReport(StrictModel):
    all_options_covered: bool
    zero_hallucination_arithmetic_passed: bool
    unsupported_probabilities_prohibited: bool
    audit_status: Literal["VERIFIED_DETERMINISTIC", "VERIFIED_HYBRID", "FALLBACK_SAFE"]
    verification_details: list[str] = Field(default_factory=list)


class AnalysisResponse(StrictModel):
    generated_at: str
    analysis_mode: Literal["meta_agent", "deterministic_fallback"]
    model_id: str | None
    provider_status: str
    question: str
    constraints: ConstraintReport
    narrative: DecisionNarrative
    tool_trace: list[ToolTraceItem]
    verifier_status: Literal["passed", "fallback", "rejected"]
    clarifications: list[ClarificationPrompt] = Field(default_factory=list)
    verification_report: VerificationReport | None = None
    grounded_citations: list[VerifiedCitation] = Field(default_factory=list)



class RecalculateRequest(StrictModel):
    base_request: DecisionInput
    overrides: dict[str, Any]


class RecalculateResponse(StrictModel):
    updated_constraints: ConstraintReport
    diff: dict[str, Any]



class RegisterUserRequest(StrictModel):
    email: str = Field(min_length=3, max_length=120)
    token: str = Field(min_length=8, max_length=128)


class SaveDecisionRequest(StrictModel):
    input_data: DecisionInput
    analysis_data: AnalysisResponse


class AddRevisionRequest(StrictModel):
    input_data: DecisionInput
    analysis_data: AnalysisResponse


# -----------------------------------------------------------------------------
# Phase 9: Calibration Mirror & Behavioral Prediction (L4A)
# -----------------------------------------------------------------------------

class PredictionCreate(StrictModel):
    statement: str = Field(min_length=5, max_length=500)
    resolution_criteria: str = Field(min_length=5, max_length=500)
    resolution_source: Literal["timestamped_submission", "github_api", "manual_checkin", "calendar_api"] = "manual_checkin"
    domain: Literal["study_prep", "coding_milestone", "follow_through", "schedule_boundary", "financial_buffer"] = "follow_through"
    horizon_days: int = Field(ge=1, le=90, default=14)
    due_at: str = Field(min_length=10, max_length=40)
    decision_id: str | None = None


class PredictionResolve(StrictModel):
    outcome: bool
    resolution_note: str = Field(default="", max_length=500)


class PredictionItem(StrictModel):
    id: str
    user_id: str
    decision_id: str | None
    statement: str
    resolution_criteria: str
    resolution_source: str
    domain: str
    horizon_days: int
    due_at: str
    p_twin: float
    p_generic: float
    p_baserate: float | None
    qualitative_band: Literal["unlikely", "toss_up", "likely", "still_learning"]
    resolved: bool
    outcome: bool | None = None
    resolved_at: str | None = None
    resolution_note: str | None = None
    brier_twin: float | None = None
    brier_generic: float | None = None
    created_at: str


class CalibrationReport(StrictModel):
    total_predictions: int
    resolved_predictions: int
    brier_twin: float | None
    brier_generic: float | None
    brier_skill_score: float | None
    accuracy_rate: float | None
    qualitative_status: str
    interpretation: str
    predictions: list[PredictionItem] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Phase 9: Person Model & Claim Store (L3)
# -----------------------------------------------------------------------------

class ClaimCreate(StrictModel):
    predicate: Literal["VALUES", "WANTS", "FEARS", "TENDS_TO", "CONSTRAINED_BY", "COMMITTED_TO"]
    object: str = Field(min_length=2, max_length=300)
    domain: Literal["career", "academics", "finances", "planning", "wellbeing", "relationships"]
    stated_support: float = Field(ge=0.0, le=1.0, default=0.8)
    revealed_support: float = Field(ge=0.0, le=1.0, default=0.5)
    half_life_days: int = Field(ge=7, le=1000, default=180)


class ClaimItem(StrictModel):
    id: str
    user_id: str
    predicate: str
    object: str
    domain: str
    stated_support: float
    revealed_support: float
    effective_support: float
    divergence_score: float
    is_divergent: bool
    half_life_days: int
    user_disputed: bool
    user_excluded: bool
    created_at: str
    last_updated: str


class ClaimDivergenceCard(StrictModel):
    claim_id: str
    title: str
    stated_description: str
    revealed_description: str
    divergence_score: float
    recommended_inquiry: str


# -----------------------------------------------------------------------------
# Phase 9: Interactive Decision DAG (L6)
# -----------------------------------------------------------------------------

class DAGNode(StrictModel):
    id: str
    label: str
    type: Literal["decision", "option", "prereq", "resource", "bottleneck", "experiment", "outcome"]
    status: Literal["FEASIBLE", "CONFLICT", "PENDING", "UNKNOWN", "VERIFIED"]
    details: str
    x: float
    y: float


class DAGEdge(StrictModel):
    id: str
    source: str
    target: str
    label: str = ""
    status: Literal["active", "blocked", "warning"] = "active"


class DecisionDAG(StrictModel):
    nodes: list[DAGNode]
    edges: list[DAGEdge]
    critical_bottlenecks: list[str]
    recommended_path: str


# -----------------------------------------------------------------------------
# Phase 9: Future Self Voice & Reflection
# -----------------------------------------------------------------------------

class FutureSelfRequest(StrictModel):
    option_id: str
    decision: DecisionInput
    time_horizon_years: int = Field(ge=1, le=10, default=3)
    tone: Literal["reflective", "analytical", "direct"] = "reflective"


class FutureSelfResponse(StrictModel):
    option_id: str
    option_name: str
    horizon_years: int
    perspective: str
    dialogue_transcript: str
    hardest_tradeoff: str
    what_i_wish_i_knew: str
    recommended_micro_experiment: str
    disclaimer: str = "Simulated reflection based strictly on supplied constraints and claims; not a forecast or psychic prediction."


# -----------------------------------------------------------------------------
# Phase 9: Multimodal Voice Dictation & Visual Scenario Generation
# -----------------------------------------------------------------------------

class VoiceTranscribeRequest(StrictModel):
    audio_text: str = Field(min_length=5, max_length=5000)
    language: str = "en"


class VoiceTranscribeResponse(StrictModel):
    raw_transcript: str
    extracted_question: str
    parsed_input: DecisionInput
    confidence_note: str


class VisualScenarioRequest(StrictModel):
    option_id: str
    option_name: str
    description: str
    horizon_months: int = 12


class VisualScenarioResponse(StrictModel):
    option_id: str
    option_name: str
    image_url: str
    prompt_used: str
    visual_narrative: str
    provider: str
