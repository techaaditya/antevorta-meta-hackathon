from __future__ import annotations

from typing import Any
from backend.app.schemas import (
    DecisionInput, ConstraintReport, ClarificationPrompt, ClarificationReport
)
from backend.app.services.constraint_engine import assess_decision


def analyze_clarity(request: DecisionInput, report: ConstraintReport | None = None) -> ClarificationReport:
    """
    Deterministically identify incomplete, ambiguous, or ungrounded assumptions
    in the decision intake and generate targeted clarification prompts with 1-click patches.
    """
    if report is None:
        report = assess_decision(request)

    prompts: list[ClarificationPrompt] = []
    penalty = 0

    # 1. Time Budget Clarity
    if request.weekly_maintenance_hours is None:
        penalty += 15
        prompts.append(ClarificationPrompt(
            id="clarify_maintenance_hours",
            field_target="weekly_maintenance_hours",
            question="What is your baseline weekly time for sleep, personal care, and essential chores?",
            why_it_matters="Without maintenance hours, Antevorta cannot calculate your true discretionary time capacity.",
            suggested_action="Assume standard 56 hours/week (8 hours/day sleep + essentials).",
            suggested_patch={"weekly_maintenance_hours": 56.0},
        ))

    if request.existing_commitments_hours is None:
        penalty += 15
        prompts.append(ClarificationPrompt(
            id="clarify_commitments_hours",
            field_target="existing_commitments_hours",
            question="How many hours per week are locked in current non-negotiable commitments (e.g. day job, family)?",
            why_it_matters="Existing commitments determine how many uncommitted hours remain for new options.",
            suggested_action="Enter your current work/study hours (e.g. 40 hours/week) or 0 if starting fresh.",
            suggested_patch={"existing_commitments_hours": 40.0},
        ))

    # 2. Option-level Time & Cost Clarity
    for option in request.options:
        if option.required_hours_per_week is None:
            penalty += 15
            prompts.append(ClarificationPrompt(
                id=f"clarify_time_{option.id}",
                field_target="required_hours_per_week",
                option_id=option.id,
                question=f"How many weekly hours does '{option.name}' require?",
                why_it_matters="Without weekly hours, time conflict feasibility cannot be evaluated.",
                suggested_action="Specify estimated hours (e.g. 20 hrs for part-time, 45 hrs for intensive).",
                suggested_patch={"options": [{"id": option.id, "required_hours_per_week": 25.0}]},
            ))

        if option.upfront_cost_npr is None and option.monthly_cost_npr is None:
            penalty += 15
            prompts.append(ClarificationPrompt(
                id=f"clarify_cost_{option.id}",
                field_target="cost_estimates",
                option_id=option.id,
                question=f"What are the estimated costs for '{option.name}'?",
                why_it_matters="Zero financial data prevents calculating budget headroom, runway, or breakeven requirements.",
                suggested_action="Specify estimated upfront cost or expected monthly expenses.",
                suggested_patch={"options": [{"id": option.id, "monthly_cost_npr": 30000.0, "upfront_cost_npr": 0.0}]},
            ))

        # Check unverified prerequisites
        unverified_prereqs = [p for p in option.prerequisites if not p.strip().lower().startswith("[x]")]
        if unverified_prereqs:
            penalty += 8
            first_unverified = unverified_prereqs[0]
            prompts.append(ClarificationPrompt(
                id=f"clarify_prereq_{option.id}",
                field_target="prerequisites",
                option_id=option.id,
                question=f"'{option.name}' has unverified dependency: '{first_unverified}'. Is this prerequisite met?",
                why_it_matters="Unverified dependencies represent single points of failure before you begin.",
                suggested_action="Mark with [x] if already completed, or design a quick test.",
                suggested_patch={"options": [{"id": option.id, "prerequisites": [f"[x] {p}" if p == first_unverified else p for p in option.prerequisites]}]},
            ))

    # 3. Financial Reserve Clarity
    if request.savings_npr is None:
        penalty += 12
        prompts.append(ClarificationPrompt(
            id="clarify_savings",
            field_target="savings_npr",
            question="What is your liquid savings reserve allocated for this decision?",
            why_it_matters="Runway months can only be calculated against a concrete reserve figure.",
            suggested_action="Enter accessible savings reserve (e.g. NPR 150,000) or 0 if none.",
            suggested_patch={"savings_npr": 150000.0},
        ))

    if request.monthly_surplus_npr is None:
        penalty += 10
        prompts.append(ClarificationPrompt(
            id="clarify_monthly_surplus",
            field_target="monthly_surplus_npr",
            question="What is your net monthly cashflow (income minus essential living expenses)?",
            why_it_matters="Determines whether you burn cash each month or accumulate budget surplus.",
            suggested_action="Enter monthly net cashflow (e.g. NPR 25,000 surplus or negative if burning savings).",
            suggested_patch={"monthly_surplus_npr": 20000.0},
        ))

    # 4. Reversible Experiment Clarity
    if not request.reversible_experiment.strip():
        penalty += 10
        prompts.append(ClarificationPrompt(
            id="clarify_reversible_experiment",
            field_target="reversible_experiment",
            question="What 1-2 week reversible micro-experiment can you run before making an irreversible leap?",
            why_it_matters="Antevorta's core principle is 'Test before you live'. Experiments de-risk decisions without permanent consequences.",
            suggested_action="Define a short prototype, interview, or trial project.",
            suggested_patch={"reversible_experiment": "Run a 2-week pilot committing 10 hours on weekends to test actual workload and interest."},
        ))

    clarity_score = max(0, min(100, 100 - penalty))
    critical_gaps = [p for p in prompts if p.field_target in ("required_hours_per_week", "cost_estimates", "savings_npr")]

    return ClarificationReport(
        clarity_score=clarity_score,
        critical_gaps_count=len(critical_gaps),
        prompts=prompts,
    )
