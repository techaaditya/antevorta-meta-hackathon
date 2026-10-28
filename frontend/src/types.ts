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

export type ClarificationPrompt = {
  id: string;
  field_target: string;
  option_id?: string | null;
  question: string;
  why_it_matters: string;
  suggested_action: string;
  suggested_patch: Record<string, any>;
};

export type ClarificationReport = {
  clarity_score: number;
  critical_gaps_count: number;
  prompts: ClarificationPrompt[];
};

export type VerifiedCitation = {
  source_name: string;
  url: string;
  retrieval_timestamp: string;
  snippet: string;
  verified: boolean;
  query: string;
};

export type VerificationReport = {
  all_options_covered: boolean;
  zero_hallucination_arithmetic_passed: boolean;
  unsupported_probabilities_prohibited: boolean;
  audit_status: 'VERIFIED_DETERMINISTIC' | 'VERIFIED_HYBRID' | 'FALLBACK_SAFE';
  verification_details: string[];
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
  clarifications?: ClarificationPrompt[];
  verification_report?: VerificationReport | null;
  grounded_citations?: VerifiedCitation[];
};

export type ApiMetaStatus = { configured: boolean; model_id: string | null; message: string };


export type OptionDelta = {
  time_headroom_delta_hours: number | null;
  budget_headroom_delta_npr: number | null;
  previous_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  updated_status: 'FEASIBLE' | 'CONFLICT' | 'UNKNOWN';
  status_changed: boolean;
};

export type RecalculateDiff = {
  changed_assumptions: Record<string, { previous: unknown; updated: unknown }>;
  capacity_delta_hours: number | null;
  option_deltas: Record<string, OptionDelta>;
  overall_status_transition: string;
};

export type RecalculateResponse = {
  updated_constraints: ConstraintReport;
  diff: RecalculateDiff;
};


export type SavedDecisionSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  revision_count: number;
  latest_version: number;
};

export type DecisionRevisionItem = {
  id: string;
  version_number: number;
  payload: DecisionInput;
  analysis_result: AnalysisResponse;
  created_at: string;
};

export type SavedDecisionDetail = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  revisions: DecisionRevisionItem[];
};

// -----------------------------------------------------------------------------
// Phase 9 Types
// -----------------------------------------------------------------------------

export type PredictionItem = {
  id: string;
  user_id: string;
  decision_id: string | null;
  statement: string;
  resolution_criteria: string;
  resolution_source: string;
  domain: string;
  horizon_days: number;
  due_at: string;
  p_twin: number;
  p_generic: number;
  p_baserate: number | null;
  qualitative_band: 'unlikely' | 'toss_up' | 'likely' | 'still_learning';
  resolved: boolean;
  outcome: boolean | null;
  resolved_at: string | null;
  resolution_note: string | null;
  brier_twin: number | null;
  brier_generic: number | null;
  created_at: string;
};

export type CalibrationReport = {
  total_predictions: number;
  resolved_predictions: number;
  brier_twin: number | null;
  brier_generic: number | null;
  brier_skill_score: number | null;
  accuracy_rate: number | null;
  qualitative_status: string;
  interpretation: string;
  predictions: PredictionItem[];
};

export type ClaimItem = {
  id: string;
  user_id: string;
  predicate: string;
  object: string;
  domain: string;
  stated_support: number;
  revealed_support: number;
  effective_support: number;
  divergence_score: number;
  is_divergent: boolean;
  half_life_days: number;
  user_disputed: boolean;
  user_excluded: boolean;
  created_at: string;
  last_updated: string;
};

export type ClaimDivergenceCard = {
  claim_id: string;
  title: string;
  stated_description: string;
  revealed_description: string;
  divergence_score: number;
  recommended_inquiry: string;
};

export type DAGNode = {
  id: string;
  label: string;
  type: 'decision' | 'option' | 'prereq' | 'resource' | 'bottleneck' | 'experiment' | 'outcome';
  status: 'FEASIBLE' | 'CONFLICT' | 'PENDING' | 'UNKNOWN' | 'VERIFIED';
  details: string;
  x: number;
  y: number;
};

export type DAGEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  status: 'active' | 'blocked' | 'warning';
};

export type DecisionDAG = {
  nodes: DAGNode[];
  edges: DAGEdge[];
  critical_bottlenecks: string[];
  recommended_path: string;
};

export type FutureSelfResponse = {
  option_id: string;
  option_name: string;
  horizon_years: number;
  perspective: string;
  dialogue_transcript: string;
  hardest_tradeoff: string;
  what_i_wish_i_knew: string;
  recommended_micro_experiment: string;
  disclaimer: string;
};

export type VoiceTranscribeResponse = {
  raw_transcript: string;
  extracted_question: string;
  parsed_input: DecisionInput;
  confidence_note: string;
};

export type VisualScenarioResponse = {
  option_id: string;
  option_name: string;
  image_url: string;
  prompt_used: string;
  visual_narrative: string;
  provider: string;
};
