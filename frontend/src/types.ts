export type OptionInput = {
  id: string;
  name: string;
  description: string;
  required_hours_per_week: number | null;
  upfront_cost_npr: number | null;
  monthly_cost_npr: number | null;
  prerequisites: string[];
  unknowns: string[];
};

export type DecisionInput = {
  question: string;
  deadline: string | null;
  horizon_months: number;
  weekly_maintenance_hours: number | null;
  existing_commitments_hours: number | null;
  savings_npr: number | null;
  monthly_surplus_npr: number | null;
  options: OptionInput[];
  important_unknowns: string[];
  reversible_experiment: string;
  criteria: string[];
};

export type OptionAssessment = {
  option_id: string;
  option_name: string;
  overall_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  time_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  weekly_available_hours: number | null;
  required_hours_per_week: number | null;
  weekly_headroom_hours: number | null;
  money_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  projected_available_budget_npr: number | null;
  projected_total_cost_npr: number | null;
  projected_budget_headroom_npr: number | null;
  missing_fields: string[];
  prerequisites_to_verify: string[];
  verified_prerequisites?: string[];
  runway_months?: number | null;
  breakeven_monthly_surplus_npr?: number | null;
  explanation: string;
};

export type ConstraintReport = {
  overall_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  time_horizon_months: number;
  weekly_capacity_hours: number | null;
  option_assessments: OptionAssessment[];
  missing_inputs: string[];
  important_unknowns: string[];
  known_facts?: string[];
  user_assumptions?: string[];
  arithmetic_policy: string;
};

export type OptionNarrative = {
  option_id: string;
  potential_upside: string;
  main_tradeoff: string;
  conditions_to_make_it_work: string[];
  questions_to_resolve: string[];
};

export type AnalysisResponse = {
  generated_at: string;
  analysis_mode: 'meta_agent' | 'deterministic_fallback';
  model_id: string | null;
  provider_status: string;
  question: string;
  constraints: ConstraintReport;
  narrative: {
    summary: string;
    option_analyses: OptionNarrative[];
    cross_option_insights: string[];
    reversible_experiment: string;
    questions_before_deciding: string[];
    caveat: string;
  };
  tool_trace: { tool: string; status: 'completed' | 'blocked' | 'failed'; detail: string }[];
  verifier_status: 'passed' | 'fallback' | 'rejected';
};

export type ApiMetaStatus = { configured: boolean; model_id: string | null; message: string };
