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



class RecalculateRequest(StrictModel):
    base_request: DecisionInput
    overrides: dict[str, Any]


class RecalculateResponse(StrictModel):
    updated_constraints: ConstraintReport
    diff: dict[str, Any]
