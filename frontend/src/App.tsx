import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, Bookmark, Check, CheckSquare, CircleAlert,
  Clock3, Compass, Download, FileText, FlaskConical, GitBranch, History, Info, KeyRound,
  Layers, LoaderCircle, Lock, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Square,
  Table, Target, Trash2, UserCheck, Wallet, WandSparkles, Workflow, Zap,
  HelpCircle, ExternalLink, CheckCircle2, Mic, Image as ImageIcon, MessageSquare, Share2, Eye, Award,
} from 'lucide-react';
import {
  analyzeDecision, getMetaStatus, recalculateConstraints, getClarificationReport,
  registerUserAccount, getCurrentUser, saveDecision, addDecisionRevision,
  listDecisions, getDecision, deleteDecision, exportAllUserData, purgeAccount,
  getDecisionDAG, getFutureSelfReflection, transcribeVoiceDecision, visualizeOptionScenario,
  listClaims, disputeClaim, excludeClaim, getClaimsDivergence,
  listPredictions, createPrediction, resolvePrediction, getCalibrationReport,
} from './api';
import type {
  AnalysisResponse, DecisionInput, OptionAssessment, OptionInput, RecalculateDiff,
  SavedDecisionSummary, SavedDecisionDetail, ClarificationReport, ClarificationPrompt,
  VerifiedCitation, VerificationReport, DecisionDAG, FutureSelfResponse,
  VoiceTranscribeResponse, VisualScenarioResponse, ClaimItem, ClaimDivergenceCard,
  PredictionItem, CalibrationReport as CalibrationReportType,
} from './types';

const initialDraft: DecisionInput = {
  question: 'Should I pursue graduate research or accept a full-time contract while finishing my thesis?',
  deadline: '2026-11-15',
  horizon_months: 12,
  weekly_maintenance_hours: 80,
  existing_commitments_hours: 45,
  savings_npr: 150000,
  monthly_surplus_npr: 8000,
  options: [
    {
      id: 'option_research',
      name: 'Research + graduate applications',
      description: 'Protect time for research, build an academic profile, and prepare postgraduate applications.',
      required_hours_per_week: 28,
      upfront_cost_npr: 120000,
      monthly_cost_npr: 10000,
      prerequisites: ['[x] Clarify application deadlines', 'Confirm funding or scholarship options'],
      unknowns: ['Funding availability', 'Supervisor response time'],
    },
    {
      id: 'option_contract',
      name: 'Full-time contract + thesis',
      description: 'Take paid work while continuing thesis work outside work hours.',
      required_hours_per_week: 48,
      upfront_cost_npr: 25000,
      monthly_cost_npr: 15000,
      prerequisites: ['Confirm actual weekly workload', 'Negotiate thesis-protected hours'],
      unknowns: ['Whether the contract workload is flexible'],
    },
  ],
  important_unknowns: ['Actual weekly workload of the contract', 'Funding and total cost of graduate applications'],
  reversible_experiment: 'Ask both the prospective supervisor and employer for a concrete two-week workload plan before committing.',
  criteria: ['Time feasibility', 'Financial feasibility', 'Research progress', 'Reversibility'],
};

const PRESETS: { id: string; label: string; description: string; data: DecisionInput }[] = [
  {
    id: 'academic',
    label: 'Academic vs Contract',
    description: 'Graduate study & research vs full-time industry contract',
    data: initialDraft,
  },
  {
    id: 'startup',
    label: 'Startup vs Tech Lead',
    description: 'Bootstrap AI developer tooling vs accept senior engineer role',
    data: {
      question: 'Should I bootstrap an AI developer tool startup or accept a senior tech lead offer?',
      deadline: '2026-12-01',
      horizon_months: 12,
      weekly_maintenance_hours: 65,
      existing_commitments_hours: 20,
      savings_npr: 500000,
      monthly_surplus_npr: 25000,
      options: [
        {
          id: 'option_bootstrap',
          name: 'Bootstrap AI DevTool',
          description: 'Dedicate primary time to product development, user interviews, and beta launch.',
          required_hours_per_week: 55,
          upfront_cost_npr: 180000,
          monthly_cost_npr: 20000,
          prerequisites: ['[x] Complete architecture prototype', 'Secure 10 beta test commitments'],
          unknowns: ['Time to first paying customer', 'Compute and API inference costs'],
        },
        {
          id: 'option_tech_lead',
          name: 'Senior Tech Lead Offer',
          description: 'Accept stable engineering leadership role with competitive compensation.',
          required_hours_per_week: 42,
          upfront_cost_npr: 15000,
          monthly_cost_npr: 5000,
          prerequisites: ['[x] Written offer letter confirmed', 'Negotiate flexible remote days'],
          unknowns: ['Autonomy level in team decisions', 'Performance bonus criteria'],
        },
      ],
      important_unknowns: ['Inference cost scaling for startup', 'Notice period policy for tech lead role'],
      reversible_experiment: 'Spend 2 weeks building a targeted micro-feature and interview 5 developers before deciding.',
      criteria: ['Autonomy and learning', 'Financial runway', 'Work-life sustainability'],
    },
  },
  {
    id: 'relocation',
    label: 'Relocation vs Remote',
    description: 'Relocate to regional tech hub vs continue working remotely',
    data: {
      question: 'Should I relocate to the central tech hub or continue working remotely from my hometown?',
      deadline: '2026-11-30',
      horizon_months: 12,
      weekly_maintenance_hours: 70,
      existing_commitments_hours: 15,
      savings_npr: 350000,
      monthly_surplus_npr: 18000,
      options: [
        {
          id: 'option_relocate',
          name: 'Relocate to Tech Hub',
          description: 'Move to capital city for in-person networking, co-working, and ecosystem access.',
          required_hours_per_week: 45,
          upfront_cost_npr: 150000,
          monthly_cost_npr: 32000,
          prerequisites: ['Find suitable shared rental apartment', 'Confirm lease deposit terms'],
          unknowns: ['Actual commute and transit overhead', 'Local networking return on investment'],
        },
        {
          id: 'option_remote',
          name: 'Continue Remote Work',
          description: 'Preserve low living costs and work from current setup with occasional travel.',
          required_hours_per_week: 38,
          upfront_cost_npr: 25000,
          monthly_cost_npr: 8000,
          prerequisites: ['[x] Dedicated fiber optic connection installed'],
          unknowns: ['Career visibility and serendipitous collaboration'],
        },
      ],
      important_unknowns: ['Rental inflation in the tech hub', 'Travel frequency required if remaining remote'],
      reversible_experiment: 'Book a 10-day trial workation in the hub to test commute and living costs before signing a lease.',
      criteria: ['Financial savings rate', 'Career networking', 'Mental health and focus'],
    },
  },
];

const blankDraft: DecisionInput = {
  question: '',
  deadline: null,
  horizon_months: 12,
  weekly_maintenance_hours: null,
  existing_commitments_hours: null,
  savings_npr: null,
  monthly_surplus_npr: null,
  options: [
    {
      id: 'option_path_a',
      name: 'Option A',
      description: '',
      required_hours_per_week: null,
      upfront_cost_npr: null,
      monthly_cost_npr: null,
      prerequisites: [],
      unknowns: [],
    },
    {
      id: 'option_path_b',
      name: 'Option B',
      description: '',
      required_hours_per_week: null,
      upfront_cost_npr: null,
      monthly_cost_npr: null,
      prerequisites: [],
      unknowns: [],
    },
  ],
  important_unknowns: [],
  reversible_experiment: '',
  criteria: [],
};

function cloneDraft(draft: DecisionInput): DecisionInput {
  return {
    ...draft,
    options: draft.options.map(o => ({
      ...o,
      prerequisites: [...o.prerequisites],
      unknowns: [...o.unknowns],
    })),
    important_unknowns: [...draft.important_unknowns],
    criteria: [...draft.criteria],
  };
}

function numericValue(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Unknown';
  return `NPR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)}`;
}

function hours(value: number | null | undefined): string {
  return value === null || value === undefined ? 'Unknown' : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)} h`;
}

function statusText(status: string): string {
  if (status === 'FEASIBLE') return 'Fits entered constraints';
  if (status === 'CONFLICT') return 'Constraint conflict';
  return 'Needs more information';
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`status-pill ${status.toLowerCase()}`}>
      <span className="status-dot" />
      {statusText(status)}
    </span>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function validateDecisionInput(draft: DecisionInput): string[] {
  const errors: string[] = [];
  if (!draft.question || draft.question.trim().length < 8) {
    errors.push('Decision question must be at least 8 characters long.');
  }
  if (draft.options.length < 2) {
    errors.push('At least 2 options are required for comparison.');
  }
  if (draft.options.length > 3) {
    errors.push('A maximum of 3 options can be compared at once.');
  }
  const names = new Set<string>();
  const ids = new Set<string>();
  draft.options.forEach((opt, idx) => {
    const letter = String.fromCharCode(65 + idx);
    if (!opt.name.trim()) {
      errors.push(`Option ${letter} must have a name.`);
    }
    const cleanName = opt.name.trim().toLowerCase();
    if (names.has(cleanName)) {
      errors.push(`Option ${letter} has a duplicate name with another path.`);
    }
    names.add(cleanName);
    if (ids.has(opt.id)) {
      errors.push(`Option ${letter} has a duplicate ID.`);
    }
    ids.add(opt.id);
    if (opt.required_hours_per_week !== null && (opt.required_hours_per_week < 0 || opt.required_hours_per_week > 168)) {
      errors.push(`Option ${letter} required hours must be between 0 and 168.`);
    }
    if (opt.upfront_cost_npr !== null && opt.upfront_cost_npr < 0) {
      errors.push(`Option ${letter} upfront cost cannot be negative.`);
    }
    if (opt.monthly_cost_npr !== null && opt.monthly_cost_npr < 0) {
      errors.push(`Option ${letter} monthly cost cannot be negative.`);
    }
  });

  if (draft.weekly_maintenance_hours !== null && (draft.weekly_maintenance_hours < 0 || draft.weekly_maintenance_hours > 168)) {
    errors.push('Weekly maintenance hours must be between 0 and 168.');
  }
  if (draft.existing_commitments_hours !== null && (draft.existing_commitments_hours < 0 || draft.existing_commitments_hours > 168)) {
    errors.push('Existing commitments hours must be between 0 and 168.');
  }
  if (draft.savings_npr !== null && draft.savings_npr < 0) {
    errors.push('Available savings cannot be negative.');
  }
  return errors;
}

export default function App() {
  const [draft, setDraft] = useState<DecisionInput>(() => cloneDraft(initialDraft));
  const [analyzedDraft, setAnalyzedDraft] = useState<DecisionInput | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [recalcDiff, setRecalcDiff] = useState<RecalculateDiff | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [metaStatus, setMetaStatus] = useState<{ configured: boolean; model_id: string | null; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'facts' | 'scenarios' | 'trace' | 'clarifications' | 'audit' | 'dag'>('overview');
  const [notice, setNotice] = useState('');
  const [activePreset, setActivePreset] = useState<string>('academic');

  // Adaptive Clarification State
  const [clarityLoading, setClarityLoading] = useState(false);
  const [intakeClarityReport, setIntakeClarityReport] = useState<ClarificationReport | null>(null);

  // Phase 9: Grand Vision State
  const [dagData, setDagData] = useState<DecisionDAG | null>(null);
  const [dagLoading, setDagLoading] = useState(false);

  const [showFutureSelfModal, setShowFutureSelfModal] = useState(false);
  const [futureSelfOptionId, setFutureSelfOptionId] = useState<string>('');
  const [futureSelfResponse, setFutureSelfResponse] = useState<FutureSelfResponse | null>(null);
  const [futureSelfLoading, setFutureSelfLoading] = useState(false);

  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [voiceTranscribeLoading, setVoiceTranscribeLoading] = useState(false);

  const [visualScenes, setVisualScenes] = useState<Record<string, VisualScenarioResponse>>({});
  const [visualLoading, setVisualLoading] = useState<Record<string, boolean>>({});

  const [showCalibrationDrawer, setShowCalibrationDrawer] = useState(false);
  const [calibrationReport, setCalibrationReport] = useState<CalibrationReportType | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState('');
  const [newMilestoneCriteria, setNewMilestoneCriteria] = useState('');
  const [newMilestoneDomain, setNewMilestoneDomain] = useState<'study_prep' | 'coding_milestone' | 'follow_through' | 'schedule_boundary' | 'financial_buffer'>('follow_through');

  const [userClaims, setUserClaims] = useState<ClaimItem[]>([]);
  const [claimDivergences, setClaimDivergences] = useState<ClaimDivergenceCard[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Persistence, History & User State
  const [userToken, setUserToken] = useState<string>(() => localStorage.getItem('antevorta_user_token') || '');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('antevorta_user_email') || '');
  const [savedDecisionId, setSavedDecisionId] = useState<string | null>(null);
  const [savedDecisionVersion, setSavedDecisionVersion] = useState<number | null>(null);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [savedDecisionsList, setSavedDecisionsList] = useState<SavedDecisionSummary[]>([]);
  const [currentDecisionDetail, setCurrentDecisionDetail] = useState<SavedDecisionDetail | null>(null);

  // Auth form state
  const [authEmailInput, setAuthEmailInput] = useState('');
  const [authTokenInput, setAuthTokenInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Interactive What-If Sandbox inputs
  const [whatIfMaintenance, setWhatIfMaintenance] = useState<number | ''>('');
  const [whatIfCommitments, setWhatIfCommitments] = useState<number | ''>('');
  const [whatIfSavings, setWhatIfSavings] = useState<number | ''>('');
  const [whatIfSurplus, setWhatIfSurplus] = useState<number | ''>('');

  useEffect(() => {
    getMetaStatus().then(setMetaStatus).catch(() => setMetaStatus(null));
    if (userToken) {
      getCurrentUser(userToken)
        .then(() => {
          loadCalibrationAndClaims(userToken);
        })
        .catch(() => {
          // Token expired/invalid
          localStorage.removeItem('antevorta_user_token');
          localStorage.removeItem('antevorta_user_email');
          setUserToken('');
          setUserEmail('');
        });
    }
  }, [userToken]);

  const loadCalibrationAndClaims = async (token: string) => {
    try {
      const [cal, claims, divs] = await Promise.all([
        getCalibrationReport(token).catch(() => null),
        listClaims(token).catch(() => []),
        getClaimsDivergence(token).catch(() => []),
      ]);
      if (cal) setCalibrationReport(cal);
      setUserClaims(claims);
      setClaimDivergences(divs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetchDAG = async () => {
    setDagLoading(true);
    try {
      const dag = await getDecisionDAG(draft);
      setDagData(dag);
    } catch (e) {
      console.error(e);
    } finally {
      setDagLoading(false);
    }
  };

  const handleConsultFutureSelf = async (optId: string) => {
    setFutureSelfOptionId(optId);
    setShowFutureSelfModal(true);
    setFutureSelfLoading(true);
    setFutureSelfResponse(null);
    try {
      const resp = await getFutureSelfReflection(optId, draft, 3);
      setFutureSelfResponse(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Future self consultation failed');
    } finally {
      setFutureSelfLoading(false);
    }
  };

  const handleVoiceParse = async () => {
    if (!voiceText.trim()) return;
    setVoiceTranscribeLoading(true);
    try {
      const res = await transcribeVoiceDecision(voiceText);
      setDraft(res.parsed_input);
      setShowVoiceModal(false);
      setNotice(`Spoken dictation parsed into decision form: "${res.extracted_question}"`);
      window.setTimeout(() => setNotice(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Voice transcription parsing failed');
    } finally {
      setVoiceTranscribeLoading(false);
    }
  };

  const handleVisualizeOption = async (opt: OptionInput) => {
    setVisualLoading(prev => ({ ...prev, [opt.id]: true }));
    try {
      const res = await visualizeOptionScenario(opt.id, opt.name, opt.description || opt.name, draft.horizon_months);
      setVisualScenes(prev => ({ ...prev, [opt.id]: res }));
    } catch (e) {
      console.error(e);
    } finally {
      setVisualLoading(prev => ({ ...prev, [opt.id]: false }));
    }
  };

  const handleCreateMilestone = async () => {
    if (!userToken || !newMilestoneText.trim() || !newMilestoneCriteria.trim()) return;
    try {
      const due = new Date();
      due.setDate(due.getDate() + 14);
      await createPrediction(userToken, {
        statement: newMilestoneText,
        resolution_criteria: newMilestoneCriteria,
        domain: newMilestoneDomain,
        horizon_days: 14,
        due_at: due.toISOString(),
        decision_id: savedDecisionId || undefined,
      });
      setNewMilestoneText('');
      setNewMilestoneCriteria('');
      await loadCalibrationAndClaims(userToken);
      setNotice('Machine-checkable micro-commitment logged to Calibration Mirror.');
      window.setTimeout(() => setNotice(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create commitment');
    }
  };

  const handleResolveMilestone = async (predId: string, outcome: boolean) => {
    if (!userToken) return;
    try {
      await resolvePrediction(userToken, predId, outcome, outcome ? 'Verified complete' : 'Missed target deadline');
      await loadCalibrationAndClaims(userToken);
      setNotice(`Milestone resolved as ${outcome ? 'Completed' : 'Missed'}. Brier Skill Score updated.`);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve milestone');
    }
  };

  const updateOption = useCallback((id: string, field: keyof OptionInput, value: unknown) => {
    setDraft(current => ({
      ...current,
      options: current.options.map(option => (option.id === id ? ({ ...option, [field]: value } as OptionInput) : option)),
    }));
  }, []);

  const loadPreset = (presetId: string) => {
    const found = PRESETS.find(p => p.id === presetId);
    if (!found) return;
    const cloned = cloneDraft(found.data);
    setDraft(cloned);
    setResult(null);
    setAnalyzedDraft(null);
    setRecalcDiff(null);
    setSavedDecisionId(null);
    setSavedDecisionVersion(null);
    setError('');
    setValidationErrors([]);
    setActivePreset(presetId);
    setIntakeClarityReport(null);
    setNotice(`Loaded preset: "${found.label}". Edit any parameter and run the stress test.`);
    window.setTimeout(() => setNotice(''), 3600);
  };

  const handleStartBlank = () => {
    const blank = cloneDraft(blankDraft);
    setDraft(blank);
    setResult(null);
    setAnalyzedDraft(null);
    setRecalcDiff(null);
    setSavedDecisionId(null);
    setSavedDecisionVersion(null);
    setError('');
    setValidationErrors([]);
    setActivePreset('blank');
    setIntakeClarityReport(null);
    setNotice('Initialized blank form. Fill in your question, capacity constraints, and at least 2 options.');
    window.setTimeout(() => setNotice(''), 3600);
  };

  const handleCheckClarity = async () => {
    setClarityLoading(true);
    setError('');
    try {
      const report = await getClarificationReport(draft);
      setIntakeClarityReport(report);
      setNotice(`Clarity evaluated: score ${report.clarity_score}/100 with ${report.prompts.length} actionable suggestions.`);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clarity evaluation failed.');
    } finally {
      setClarityLoading(false);
    }
  };

  const applyClarificationPatch = (patch: Record<string, any>) => {
    setDraft(current => {
      const updated = { ...current };
      if ('weekly_maintenance_hours' in patch) updated.weekly_maintenance_hours = patch.weekly_maintenance_hours;
      if ('existing_commitments_hours' in patch) updated.existing_commitments_hours = patch.existing_commitments_hours;
      if ('savings_npr' in patch) updated.savings_npr = patch.savings_npr;
      if ('monthly_surplus_npr' in patch) updated.monthly_surplus_npr = patch.monthly_surplus_npr;
      if ('reversible_experiment' in patch) updated.reversible_experiment = patch.reversible_experiment;
      if ('options' in patch && Array.isArray(patch.options)) {
        updated.options = updated.options.map(opt => {
          const patchOpt = patch.options.find((p: any) => p.id === opt.id);
          if (patchOpt) {
            return {
              ...opt,
              ...patchOpt,
            };
          }
          return opt;
        });
      }
      return updated;
    });
    setIntakeClarityReport(prev => {
      if (!prev) return null;
      const remaining = prev.prompts.filter(p => JSON.stringify(p.suggested_patch) !== JSON.stringify(patch));
      return {
        ...prev,
        clarity_score: Math.min(100, prev.clarity_score + 15),
        prompts: remaining,
        critical_gaps_count: Math.max(0, prev.critical_gaps_count - 1),
      };
    });
    setNotice('Applied suggested assumption to decision form.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const addOption = () => {
    if (draft.options.length >= 3) return;
    const nextNum = draft.options.length + 1;
    const option: OptionInput = {
      id: `option_path_${nextNum}`,
      name: `Alternative Path ${String.fromCharCode(64 + nextNum)}`,
      description: '',
      required_hours_per_week: null,
      upfront_cost_npr: null,
      monthly_cost_npr: null,
      prerequisites: [],
      unknowns: [],
    };
    setDraft(current => ({ ...current, options: [...current.options, option] }));
  };

  const removeOption = (id: string) => {
    if (draft.options.length <= 2) return;
    setDraft(current => ({ ...current, options: current.options.filter(option => option.id !== id) }));
    setResult(null);
    setAnalyzedDraft(null);
    setRecalcDiff(null);
  };

  const togglePrerequisite = (optionId: string, index: number) => {
    setDraft(current => ({
      ...current,
      options: current.options.map(opt => {
        if (opt.id !== optionId) return opt;
        const updated = [...opt.prerequisites];
        const item = updated[index];
        if (item.toLowerCase().startsWith('[x]')) {
          updated[index] = item.slice(3).trim();
        } else if (item.startsWith('[ ]')) {
          updated[index] = `[x] ${item.slice(3).trim()}`;
        } else {
          updated[index] = `[x] ${item}`;
        }
        return { ...opt, prerequisites: updated };
      }),
    }));
  };

  const runAnalysis = async () => {
    const errors = validateDecisionInput(draft);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setError('Please resolve the input issues highlighted below before proceeding.');
      return;
    }
    setValidationErrors([]);
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const cleaned: DecisionInput = {
        ...draft,
        deadline: draft.deadline || null,
        options: draft.options.map(o => ({
          ...o,
          name: o.name.trim(),
          description: o.description.trim(),
          prerequisites: o.prerequisites.filter(Boolean),
          unknowns: o.unknowns.filter(Boolean),
        })),
        important_unknowns: draft.important_unknowns.filter(Boolean),
      };
      const response = await analyzeDecision(cleaned);
      setResult(response);
      setAnalyzedDraft(cloneDraft(cleaned));
      setRecalcDiff(null);
      // Initialize what-if sandbox inputs
      setWhatIfMaintenance(cleaned.weekly_maintenance_hours ?? '');
      setWhatIfCommitments(cleaned.existing_commitments_hours ?? '');
      setWhatIfSavings(cleaned.savings_npr ?? '');
      setWhatIfSurplus(cleaned.monthly_surplus_npr ?? '');

      setActiveTab('overview');
      document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Check that the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRecalculate = async (overridesToApply?: Record<string, unknown>) => {
    if (!result) return;
    const base = analyzedDraft || draft;
    const overrides = overridesToApply || {
      weekly_maintenance_hours: draft.weekly_maintenance_hours,
      existing_commitments_hours: draft.existing_commitments_hours,
      savings_npr: draft.savings_npr,
      monthly_surplus_npr: draft.monthly_surplus_npr,
      horizon_months: draft.horizon_months,
      options: draft.options,
    };
    setRecalcLoading(true);
    try {
      const res = await recalculateConstraints(base, overrides);
      setResult(prev => (prev ? { ...prev, constraints: res.updated_constraints } : null));
      setRecalcDiff(res.diff);
      setAnalyzedDraft(cloneDraft({ ...base, ...overrides } as DecisionInput));
      setNotice('Constraints deterministically recalculated. What-if diff updated.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recalculation failed.');
    } finally {
      setRecalcLoading(false);
    }
  };

  const handleApplyWhatIfSandbox = () => {
    const overrides: Record<string, unknown> = {};
    if (whatIfMaintenance !== '') overrides.weekly_maintenance_hours = Number(whatIfMaintenance);
    if (whatIfCommitments !== '') overrides.existing_commitments_hours = Number(whatIfCommitments);
    if (whatIfSavings !== '') overrides.savings_npr = Number(whatIfSavings);
    if (whatIfSurplus !== '') overrides.monthly_surplus_npr = Number(whatIfSurplus);
    handleQuickRecalculate(overrides);
  };

  // Phase 5 Persistence & History Operations
  const handleAuthSubmit = async () => {
    if (!authEmailInput.trim() || !authTokenInput.trim()) {
      setAuthError('Please enter both email and private secret token.');
      return;
    }
    setAuthError('');
    try {
      // Try registering; if already exists, verify via getCurrentUser
      try {
        await registerUserAccount(authEmailInput.trim(), authTokenInput.trim());
      } catch {
        // Assume existing account and attempt login with token
      }
      const me = await getCurrentUser(authTokenInput.trim());
      setUserToken(authTokenInput.trim());
      setUserEmail(me.user.email);
      localStorage.setItem('antevorta_user_token', authTokenInput.trim());
      localStorage.setItem('antevorta_user_email', me.user.email);
      setShowAuthModal(false);
      setNotice(`Signed in as ${me.user.email}. Decisions can now be saved to persistent history.`);
      window.setTimeout(() => setNotice(''), 3600);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Authentication failed. Check your secret token.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('antevorta_user_token');
    localStorage.removeItem('antevorta_user_email');
    setUserToken('');
    setUserEmail('');
    setSavedDecisionId(null);
    setSavedDecisionVersion(null);
    setNotice('Signed out. Workbench returned to stateless mode.');
    window.setTimeout(() => setNotice(''), 3600);
  };

  const handleSaveToHistory = async () => {
    if (!result) return;
    if (!userToken) {
      setShowAuthModal(true);
      return;
    }
    try {
      if (savedDecisionId) {
        // Add new revision to existing decision
        const res = await addDecisionRevision(userToken, savedDecisionId, analyzedDraft || draft, result);
        setSavedDecisionVersion(res.version_number);
        setNotice(`Saved new version (v${res.version_number}) to your decision history.`);
      } else {
        // Create new decision record
        const res = await saveDecision(userToken, analyzedDraft || draft, result);
        setSavedDecisionId(res.id);
        setSavedDecisionVersion(res.latest_version);
        setNotice(`Decision saved to history (v${res.latest_version}).`);
      }
      window.setTimeout(() => setNotice(''), 3600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save decision.');
    }
  };

  const handleOpenHistoryModal = async () => {
    if (!userToken) {
      setShowAuthModal(true);
      return;
    }
    try {
      const data = await listDecisions(userToken);
      setSavedDecisionsList(data.decisions);
      setShowHistoryModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load decision history.');
    }
  };

  const handleLoadDecisionDetail = async (decisionId: string) => {
    try {
      const detail = await getDecision(userToken, decisionId);
      setCurrentDecisionDetail(detail);
      if (detail.revisions.length > 0) {
        const latest = detail.revisions[detail.revisions.length - 1];
        setDraft(cloneDraft(latest.payload));
        setAnalyzedDraft(cloneDraft(latest.payload));
        setResult(latest.analysis_result);
        setSavedDecisionId(detail.id);
        setSavedDecisionVersion(latest.version_number);
        setShowHistoryModal(false);
        setNotice(`Loaded "${detail.title}" (version ${latest.version_number}).`);
        window.setTimeout(() => setNotice(''), 3600);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load decision.');
    }
  };

  const handleLoadSpecificRevision = (revision: SavedDecisionDetail['revisions'][number]) => {
    setDraft(cloneDraft(revision.payload));
    setAnalyzedDraft(cloneDraft(revision.payload));
    setResult(revision.analysis_result);
    setSavedDecisionVersion(revision.version_number);
    setShowHistoryModal(false);
    setNotice(`Switched to version ${revision.version_number}.`);
    window.setTimeout(() => setNotice(''), 3600);
  };

  const handleDeleteSavedDecision = async (decisionId: string) => {
    try {
      await deleteDecision(userToken, decisionId);
      setSavedDecisionsList(prev => prev.filter(d => d.id !== decisionId));
      if (savedDecisionId === decisionId) {
        setSavedDecisionId(null);
        setSavedDecisionVersion(null);
      }
      setNotice('Decision permanently deleted from database.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete decision.');
    }
  };

  const handleExportPrivacyData = async () => {
    try {
      const data = await exportAllUserData(userToken);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `antevorta-user-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Privacy export failed.');
    }
  };

  const handlePurgeAccountData = async () => {
    if (!window.confirm('Are you sure you want to permanently purge your account and all saved decisions? This cannot be undone.')) {
      return;
    }
    try {
      await purgeAccount(userToken);
      handleSignOut();
      setShowPrivacyModal(false);
      setNotice('Your account and all associated decision history have been permanently purged.');
      window.setTimeout(() => setNotice(''), 3600);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Account purge failed.');
    }
  };

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ input: analyzedDraft || draft, result, diff: recalcDiff }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `antevorta-decision-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateNumeric = (
    key: 'horizon_months' | 'weekly_maintenance_hours' | 'existing_commitments_hours' | 'savings_npr' | 'monthly_surplus_npr',
    value: string,
  ) => {
    setDraft(current => ({
      ...current,
      [key]: key === 'horizon_months' ? (value.trim() === '' ? 12 : Number(value)) : numericValue(value),
    }));
  };

  const assessmentById = useMemo(() => new Map(result?.constraints.option_assessments.map(a => [a.option_id, a]) || []), [result]);

  // Stale detection: if current draft inputs differ from analyzed draft
  const isStale = useMemo(() => {
    if (!result || !analyzedDraft) return false;
    return JSON.stringify(draft) !== JSON.stringify(analyzedDraft);
  }, [result, analyzedDraft, draft]);

  const capacityExhausted =
    draft.weekly_maintenance_hours !== null &&
    draft.existing_commitments_hours !== null &&
    draft.weekly_maintenance_hours + draft.existing_commitments_hours > 168;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Antevorta home">
          <span className="brand-icon"><Compass size={20} strokeWidth={1.8} /></span>
          <span className="brand-word">antevorta<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <button
            type="button"
            className="voice-mic-btn"
            onClick={() => setShowVoiceModal(true)}
            title="Dictate dilemma with Meta Muse Voice Transcribe"
          >
            <Mic size={13} /> Voice Intake
          </button>
          <button
            type="button"
            className="history-button"
            onClick={() => {
              setShowCalibrationDrawer(true);
              if (userToken) loadCalibrationAndClaims(userToken);
            }}
            title="L4A Brier Score & Behavioral Milestones"
          >
            <Target size={13} /> Calibration Mirror
            {calibrationReport?.brier_skill_score !== null && calibrationReport?.brier_skill_score !== undefined && (
              <span style={{ color: 'var(--green)', marginLeft: 4, fontWeight: 700 }}>
                {((calibrationReport.brier_skill_score) * 100).toFixed(0)}% BSS
              </span>
            )}
          </button>
          {result && (
            <button
              type="button"
              className="share-brief-btn"
              onClick={() => setShowShareModal(true)}
              title="Export shareable Decision Brief for X / Social"
            >
              <Share2 size={13} /> Decision Memo
            </button>
          )}

          {userToken ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" className="history-button" onClick={handleOpenHistoryModal}>
                <History size={13} /> Decision History
              </button>
              <div className="user-chip">
                <UserCheck size={13} /> {userEmail.split('@')[0]}
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPrivacyModal(true)}
                title="Privacy & Data Controls"
              >
                <ShieldCheck size={14} />
              </button>
              <button type="button" className="icon-button" onClick={handleSignOut} title="Sign Out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button type="button" className="history-button" onClick={() => setShowAuthModal(true)}>
              <Lock size={13} /> Sign In / Save History
            </button>
          )}

          <div className={`connection-chip ${metaStatus?.configured ? 'online' : 'offline'}`}>
            <span className="connection-dot" />
            {metaStatus?.configured ? 'Meta API configured' : 'Deterministic engine active'}
          </div>
          <a className="docs-link" href="https://dev.meta.ai/docs/overview" target="_blank" rel="noreferrer">
            Meta API <ArrowDownRight size={14} />
          </a>
        </div>
      </header>

      <main id="top" className="main-layout">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-mark"><Sparkles size={13} /></span> DECISION INTELLIGENCE / 001</div>
          <h1>Test your plans<br /><span>against reality.</span></h1>
          <p className="hero-copy">
            Bring consequential decisions with competing constraints. Antevorta performs exact time and financial arithmetic,
            isolates unverified prerequisites, and guides structured conditional scenarios before you commit.
          </p>
          <div className="hero-meta">
            <span><ShieldCheck size={15} /> Exact arithmetic</span>
            <span><Activity size={15} /> Prerequisite tracking</span>
            <span><GitBranch size={15} /> Zero simulated odds</span>
            <span><Workflow size={15} /> What-if sensitivity</span>
            <span><Lock size={15} /> Privacy-first persistence</span>
          </div>

          <div className="preset-bar">
            <span className="preset-label">Decision Presets:</span>
            <div className="preset-buttons">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-pill ${activePreset === preset.id ? 'active' : ''}`}
                  onClick={() => loadPreset(preset.id)}
                >
                  <FileText size={13} /> {preset.label}
                </button>
              ))}
              <button
                type="button"
                className={`preset-pill clear-pill ${activePreset === 'blank' ? 'active' : ''}`}
                onClick={handleStartBlank}
              >
                <Trash2 size={13} /> Clear to blank
              </button>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <section className="builder-column">
            <div className="section-topline">
              <span className="section-index">01</span>
              <div>
                <h2>Set up your decision</h2>
                <p>Define your core question and baseline capacity constraints.</p>
              </div>
              <button className="text-button" onClick={() => loadPreset('academic')}>
                <RefreshCw size={14} /> Reset example
              </button>
            </div>

            <div className="form-card">
              <div className="form-section-title">
                <span className="tiny-step">A</span>
                <div>
                  <h3>The decision question</h3>
                  <p>State the specific choice you are evaluating.</p>
                </div>
              </div>
              <Field label="Decision question" hint="Be specific enough to compare concrete alternatives.">
                <textarea
                  value={draft.question}
                  onChange={e => setDraft(d => ({ ...d, question: e.target.value }))}
                  rows={3}
                  maxLength={1200}
                  placeholder="e.g. Should I accept the tech lead offer or bootstrap my own venture?"
                />
              </Field>
              <div className="field-row three-col">
                <Field label="Decision deadline">
                  <input
                    type="date"
                    value={draft.deadline || ''}
                    onChange={e => setDraft(d => ({ ...d, deadline: e.target.value || null }))}
                  />
                </Field>
                <Field label="Horizon (months)" hint="Comparison timeframe.">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={draft.horizon_months}
                    onChange={e => updateNumeric('horizon_months', e.target.value)}
                  />
                </Field>
                <Field label="Weekly maintenance (h)" hint="Sleep, commute, meals, domestic.">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    step={0.5}
                    value={draft.weekly_maintenance_hours ?? ''}
                    onChange={e => updateNumeric('weekly_maintenance_hours', e.target.value)}
                    placeholder="Unknown"
                  />
                </Field>
              </div>

              <div className="form-section-title later">
                <span className="tiny-step">B</span>
                <div>
                  <h3>Baseline commitments & financial capacity</h3>
                  <p>These constraints remain shared across all options.</p>
                </div>
              </div>
              <div className="field-row three-col">
                <Field label="Existing commitments (h/week)" hint="Non-negotiable hours.">
                  <input
                    type="number"
                    min={0}
                    max={168}
                    step={0.5}
                    value={draft.existing_commitments_hours ?? ''}
                    onChange={e => updateNumeric('existing_commitments_hours', e.target.value)}
                    placeholder="Unknown"
                  />
                </Field>
                <Field label="Available liquid savings (NPR)" hint="Available reserve.">
                  <input
                    type="number"
                    min={0}
                    value={draft.savings_npr ?? ''}
                    onChange={e => updateNumeric('savings_npr', e.target.value)}
                    placeholder="Unknown"
                  />
                </Field>
                <Field label="Monthly surplus / deficit (NPR)" hint="Negative for net deficit.">
                  <input
                    type="number"
                    value={draft.monthly_surplus_npr ?? ''}
                    onChange={e => updateNumeric('monthly_surplus_npr', e.target.value)}
                    placeholder="Unknown"
                  />
                </Field>
              </div>

              {capacityExhausted && (
                <div className="notice-box" style={{ background: 'var(--rose-bg)', borderColor: 'var(--rose-border)', color: 'var(--rose)' }}>
                  <CircleAlert size={16} />
                  <span>
                    Warning: Maintenance ({draft.weekly_maintenance_hours}h) + commitments ({draft.existing_commitments_hours}h) ={' '}
                    {(draft.weekly_maintenance_hours || 0) + (draft.existing_commitments_hours || 0)}h/week, exceeding the 168h week limit.
                    This produces an immediate capacity conflict.
                  </span>
                </div>
              )}
            </div>

            <div className="options-section-header">
              <div className="section-topline compact">
                <span className="section-index">02</span>
                <div>
                  <h2>Define the paths</h2>
                  <p>Compare two or three concrete options.</p>
                </div>
              </div>
              <span className="counter">{draft.options.length} / 3 OPTIONS</span>
            </div>

            <div className="option-editor-grid">
              {draft.options.map((option, index) => (
                <article className={`option-editor option-editor-${index}`} key={option.id}>
                  <div className="option-editor-top">
                    <div className="option-letter">{String.fromCharCode(65 + index)}</div>
                    <span className="option-kicker">PATH {String(index + 1).padStart(2, '0')}</span>
                    {draft.options.length > 2 && (
                      <button
                        className="icon-button"
                        onClick={() => removeOption(option.id)}
                        aria-label={`Remove ${option.name}`}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <Field label="Option name">
                    <input
                      value={option.name}
                      onChange={e => updateOption(option.id, 'name', e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Full-time job"
                    />
                  </Field>
                  <Field label="What does this path involve?">
                    <textarea
                      value={option.description}
                      onChange={e => updateOption(option.id, 'description', e.target.value)}
                      rows={2}
                      maxLength={1500}
                      placeholder="Describe the plan, scope, and goal."
                    />
                  </Field>
                  <div className="field-row two-col">
                    <Field label="Hours per week">
                      <input
                        type="number"
                        min={0}
                        max={168}
                        step={0.5}
                        value={option.required_hours_per_week ?? ''}
                        onChange={e => updateOption(option.id, 'required_hours_per_week', numericValue(e.target.value))}
                        placeholder="Unknown"
                      />
                    </Field>
                    <Field label="Upfront cost (NPR)">
                      <input
                        type="number"
                        min={0}
                        value={option.upfront_cost_npr ?? ''}
                        onChange={e => updateOption(option.id, 'upfront_cost_npr', numericValue(e.target.value))}
                        placeholder="Unknown"
                      />
                    </Field>
                  </div>
                  <Field label="Ongoing monthly cost (NPR)">
                    <input
                      type="number"
                      min={0}
                      value={option.monthly_cost_npr ?? ''}
                      onChange={e => updateOption(option.id, 'monthly_cost_npr', numericValue(e.target.value))}
                      placeholder="Unknown"
                    />
                  </Field>

                  <Field label="Prerequisites (Click box to toggle verified status)" hint="Lines with [x] are treated as verified.">
                    <div className="prereq-list">
                      {option.prerequisites.map((p, pIdx) => {
                        const isVerified = p.toLowerCase().startsWith('[x]');
                        const label = isVerified ? p.slice(3).trim() : p.startsWith('[ ]') ? p.slice(3).trim() : p;
                        return (
                          <div key={pIdx} className="prereq-row">
                            <button
                              type="button"
                              className={`prereq-check ${isVerified ? 'checked' : ''}`}
                              onClick={() => togglePrerequisite(option.id, pIdx)}
                              title={isVerified ? 'Click to mark unverified' : 'Click to mark verified'}
                            >
                              {isVerified ? <CheckSquare size={13} /> : <Square size={13} />}
                            </button>
                            <span className={`prereq-text ${isVerified ? 'done' : ''}`}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                    <textarea
                      style={{ marginTop: 8 }}
                      value={option.prerequisites.join('\n')}
                      onChange={e => updateOption(option.id, 'prerequisites', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))}
                      rows={2}
                      placeholder="Enter prerequisites (one per line, e.g. [x] Signed contract)"
                    />
                  </Field>

                  <Field label="Option-specific unknowns" hint="One per line.">
                    <textarea
                      value={option.unknowns.join('\n')}
                      onChange={e => updateOption(option.id, 'unknowns', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))}
                      rows={2}
                      placeholder="Missing facts that could alter this choice"
                    />
                  </Field>
                </article>
              ))}
              {draft.options.length < 3 && (
                <button className="add-option" onClick={addOption} type="button">
                  <span><Plus size={18} /></span>
                  <strong>Add third path</strong>
                  <small>Explore an alternative without committing to it.</small>
                </button>
              )}
            </div>

            <div className="form-card followup-card">
              <div className="form-section-title">
                <span className="tiny-step">C</span>
                <div>
                  <h3>Uncertainties & Reversible Experiment</h3>
                  <p>Identify what to test first to de-risk this decision.</p>
                </div>
              </div>
              <Field label="Important unknowns" hint="One per line. Blank is fine; unknowns are honest.">
                <textarea
                  value={draft.important_unknowns.join('\n')}
                  onChange={e => setDraft(d => ({ ...d, important_unknowns: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) }))}
                  rows={2}
                  placeholder="What information must be uncovered before deciding?"
                />
              </Field>
              <Field label="One reversible experiment" hint="A small, low-risk test of reality.">
                <textarea
                  value={draft.reversible_experiment}
                  onChange={e => setDraft(d => ({ ...d, reversible_experiment: e.target.value }))}
                  rows={2}
                  maxLength={1200}
                  placeholder="e.g. Run a two-week trial audit or interview 3 people on this path."
                />
              </Field>

              {validationErrors.length > 0 && (
                <div className="validation-alert" role="alert">
                  <div className="validation-header">
                    <CircleAlert size={16} />
                    <span>Please correct the following inputs:</span>
                  </div>
                  <ul className="validation-list">
                    {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="intake-action-row">
                <button
                  className="analyze-button"
                  type="button"
                  onClick={runAnalysis}
                  disabled={loading}
                >
                  {loading ? (
                    <><LoaderCircle className="spin" size={17} /> Running deterministic stress test…</>
                  ) : (
                    <><WandSparkles size={17} /> Run decision stress test <ArrowRight size={16} /></>
                  )}
                </button>
                <button
                  className="clarity-check-button"
                  type="button"
                  onClick={handleCheckClarity}
                  disabled={clarityLoading}
                >
                  {clarityLoading ? (
                    <><LoaderCircle className="spin" size={15} /> Checking…</>
                  ) : (
                    <><HelpCircle size={15} /> Check Input Clarity</>
                  )}
                </button>
              </div>

              {intakeClarityReport && (
                <div className="clarity-panel">
                  <div className="clarity-header">
                    <div>
                      <span className="label-upper">ADAPTIVE CLARIFICATION ANALYSIS</span>
                      <h4 style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                        Input Quality & Completeness
                      </h4>
                    </div>
                    <span className={`clarity-score-chip ${intakeClarityReport.clarity_score >= 80 ? 'clarity-score-good' : intakeClarityReport.clarity_score >= 50 ? 'clarity-score-fair' : 'clarity-score-poor'}`}>
                      Clarity Score: {intakeClarityReport.clarity_score}/100
                    </span>
                  </div>
                  <div className="clarity-meter-bar">
                    <div
                      className="clarity-meter-fill"
                      style={{
                        width: `${intakeClarityReport.clarity_score}%`,
                        backgroundColor: intakeClarityReport.clarity_score >= 80 ? 'var(--emerald)' : intakeClarityReport.clarity_score >= 50 ? 'var(--amber)' : 'var(--rose)',
                      }}
                    />
                  </div>
                  {intakeClarityReport.prompts.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--emerald)' }}>
                      <Check size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                      All core assumptions and constraints are fully specified without missing parameters!
                    </div>
                  ) : (
                    <div className="clarity-prompts-list">
                      {intakeClarityReport.prompts.map(prompt => (
                        <div key={prompt.id} className="clarity-prompt-item">
                          <div className="clarity-prompt-title">{prompt.question}</div>
                          <div className="clarity-prompt-why">{prompt.why_it_matters}</div>
                          <div className="clarity-prompt-action-row">
                            <span className="clarity-prompt-hint">{prompt.suggested_action}</span>
                            {Object.keys(prompt.suggested_patch).length > 0 && (
                              <button
                                type="button"
                                className="btn-apply-patch"
                                onClick={() => applyClarificationPatch(prompt.suggested_patch)}
                              >
                                <Zap size={12} /> Apply Suggested Assumption
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="privacy-note">
                <ShieldCheck size={14} />
                <span>Zero unsolicited tracking. Decision history is encrypted and isolated to your private account.</span>
              </div>
              {error && <div className="error-box" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}
              {notice && <div className="notice-box" role="status"><Check size={16} />{notice}</div>}
            </div>
          </section>

          <aside className="side-column">
            <section className="side-card capacity-card">
              <div className="side-card-heading">
                <span className="side-icon"><Clock3 size={16} /></span>
                <span>WEEKLY CAPACITY SNAPSHOT</span>
              </div>
              <div className="capacity-number">
                {draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null
                  ? hours(168 - draft.weekly_maintenance_hours - draft.existing_commitments_hours)
                  : '—'}
              </div>
              <p className="capacity-label">weekly discretionary hours remaining</p>
              <div className={`capacity-bar ${draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null ? '' : 'unknown'}`}>
                <span
                  style={{
                    width: `${
                      draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null
                        ? Math.max(0, Math.min(100, ((draft.weekly_maintenance_hours + draft.existing_commitments_hours) / 168) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="capacity-legend">
                <span><i className="dot-fixed" /> Maintenance + commitments</span>
                <span><i className="dot-free" /> Discretionary headroom</span>
              </div>
              {(draft.weekly_maintenance_hours === null || draft.existing_commitments_hours === null) && (
                <p className="capacity-unknown">Enter both weekly maintenance and existing commitments to calculate headroom.</p>
              )}
              <p className="micro-note">Calculated deterministically from 168 total hours. Never silently assumes zero.</p>
            </section>

            <section className="side-card principles-card">
              <div className="side-card-heading">
                <span className="side-icon"><ShieldCheck size={16} /></span>
                <span>ENGINEERING PRINCIPLES</span>
              </div>
              <ul className="principles-list">
                <li>
                  <Check size={15} />
                  <span>
                    <strong>Exact math, zero hallucinations</strong>
                    <small>Time headroom and budget headroom are verified pure functions.</small>
                  </span>
                </li>
                <li>
                  <Check size={15} />
                  <span>
                    <strong>Unknown stays unknown</strong>
                    <small>Missing inputs produce explicit UNKNOWN states, never zero.</small>
                  </span>
                </li>
                <li>
                  <Check size={15} />
                  <span>
                    <strong>Verified prerequisites</strong>
                    <small>Feasibility is held at UNKNOWN until prerequisites are explicitly marked verified.</small>
                  </span>
                </li>
                <li>
                  <Check size={15} />
                  <span>
                    <strong>No synthetic success percentages</strong>
                    <small>We do not fabricate confidence or long-horizon success odds.</small>
                  </span>
                </li>
              </ul>
            </section>

            <section className="side-card meta-card">
              <div className="side-card-heading">
                <span className="side-icon"><Sparkles size={16} /></span>
                <span>ORCHESTRATION MODE</span>
              </div>
              <div className="model-row">
                <span className={`model-pulse ${metaStatus?.configured ? 'active' : ''}`} />
                <div>
                  <strong>{metaStatus?.configured ? (metaStatus.model_id || 'Meta Model API') : 'Deterministic Engine'}</strong>
                  <small>{metaStatus?.configured ? 'Server-side key detected' : 'Meta API key absent; fallback mode active'}</small>
                </div>
              </div>
              <p className="micro-note">
                When Meta Model API is configured, Muse Spark runs an allowlisted tool loop. In fallback mode, deterministic calculation remains 100% active.
              </p>
            </section>

            <div className="quote-card">
              <span className="quote-mark">“</span>
              <p>Test your decisions before you live them.</p>
              <span className="quote-caption">ANTEVORTA PRODUCT PRINCIPLE</span>
            </div>
          </aside>
        </div>

        <section id="analysis-results" className="results-section">
          <div className="results-title-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-mark"><Workflow size={13} /></span> DECISION REPORT</div>
              <h2>Stress Test Analysis</h2>
              <p>Deterministic constraint arithmetic combined with structured scenario breakdown.</p>
            </div>
            {result && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="export-button"
                  style={{ background: 'var(--emerald-bg)', borderColor: 'var(--emerald-border)', color: 'var(--emerald)' }}
                  onClick={handleSaveToHistory}
                  type="button"
                >
                  <Bookmark size={14} /> {savedDecisionId ? `Save New Version (v${(savedDecisionVersion || 1) + 1})` : 'Save to History'}
                </button>
                <button className="export-button" onClick={exportResult} type="button">
                  <Download size={14} /> Export JSON
                </button>
              </div>
            )}
          </div>

          {!result ? (
            <div className="empty-results">
              <div className="empty-orbit"><GitBranch size={28} strokeWidth={1.5} /></div>
              <h3>Your verified decision analysis will appear here.</h3>
              <p>Select a preset above or input your own parameters, then run the stress test to inspect feasibility, matrix comparison, and conditional scenarios.</p>
              <div className="empty-steps">
                <span><i>01</i> Enter real constraints</span>
                <span><i>02</i> Verify prerequisites</span>
                <span><i>03</i> Inspect arithmetic & scenarios</span>
              </div>
            </div>
          ) : (
            <>
              {isStale && (
                <div className="stale-banner" role="alert">
                  <div className="stale-left">
                    <CircleAlert size={20} />
                    <div>
                      <strong>Analysis is Outdated / Stale</strong>
                      <p>Inputs in the builder above have changed since this analysis was generated.</p>
                    </div>
                  </div>
                  <div className="stale-actions">
                    <button
                      type="button"
                      className="stale-btn-recalc"
                      onClick={() => handleQuickRecalculate()}
                      disabled={recalcLoading}
                    >
                      {recalcLoading ? <LoaderCircle className="spin" size={13} /> : <Zap size={13} />} Quick Recalculate
                    </button>
                    <button
                      type="button"
                      className="stale-btn-rerun"
                      onClick={runAnalysis}
                      disabled={loading}
                    >
                      {loading ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />} Rerun Full Stress Test
                    </button>
                  </div>
                </div>
              )}

              <div className="provenance-legend">
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}><Info size={13} /> Claim Provenance:</span>
                <span><span className="prov-badge prov-fact">USER FACT</span> Direct user input</span>
                <span><span className="prov-badge prov-calc">MATH CALC</span> Pure deterministic arithmetic</span>
                <span><span className="prov-badge prov-scenario">SCENARIO</span> Conditional model synthesis</span>
                <span><span className="prov-badge prov-unknown">UNKNOWN</span> Missing info or unverified</span>
              </div>

              <div className="report-status-row">
                <div className="report-mode">
                  <span className={`mode-icon ${result.analysis_mode}`}><Sparkles size={17} /></span>
                  <div>
                    <strong>{result.analysis_mode === 'meta_agent' ? 'Meta Muse Spark Agent Analysis' : 'Deterministic Decision Analysis (Fallback)'}</strong>
                    <small>
                      {result.model_id ? `Model: ${result.model_id}` : 'Pure deterministic arithmetic mode; zero LLM speculation.'}
                      {savedDecisionVersion && ` · Version ${savedDecisionVersion} loaded`}
                    </small>
                  </div>
                </div>
                <div className={`verifier-chip ${result.verifier_status}`}>
                  <ShieldCheck size={14} /> Verifier: {result.verifier_status}
                </div>
              </div>

              <div className="report-intro">
                <span className="label-upper">QUESTION EVALUATED</span>
                <h3>{result.question}</h3>
                <p>{result.narrative.summary}</p>
              </div>

              <div className="results-tabs" role="tablist" aria-label="Analysis sections">
                <button
                  role="tab"
                  aria-selected={activeTab === 'overview'}
                  className={activeTab === 'overview' ? 'active' : ''}
                  onClick={() => setActiveTab('overview')}
                >
                  <Activity size={13} /> Feasibility Cards
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'comparison'}
                  className={activeTab === 'comparison' ? 'active' : ''}
                  onClick={() => setActiveTab('comparison')}
                >
                  <Table size={13} /> Comparative Matrix
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'facts'}
                  className={activeTab === 'facts' ? 'active' : ''}
                  onClick={() => setActiveTab('facts')}
                >
                  <Layers size={13} /> Facts & Assumptions
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'scenarios'}
                  className={activeTab === 'scenarios' ? 'active' : ''}
                  onClick={() => setActiveTab('scenarios')}
                >
                  <GitBranch size={13} /> Scenarios
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'trace'}
                  className={activeTab === 'trace' ? 'active' : ''}
                  onClick={() => setActiveTab('trace')}
                >
                  <ShieldCheck size={13} /> Agent Trace <span>{result.tool_trace.length}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'clarifications'}
                  className={activeTab === 'clarifications' ? 'active' : ''}
                  onClick={() => setActiveTab('clarifications')}
                >
                  <HelpCircle size={13} /> Clarifications <span>{result.clarifications?.length || 0}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'audit'}
                  className={activeTab === 'audit' ? 'active' : ''}
                  onClick={() => setActiveTab('audit')}
                >
                  <CheckCircle2 size={13} /> Verification Audit & Citations <span>{(result.grounded_citations?.length || 0) + (result.verification_report ? 1 : 0)}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeTab === 'dag'}
                  className={activeTab === 'dag' ? 'active' : ''}
                  onClick={() => {
                    setActiveTab('dag');
                    if (!dagData) handleFetchDAG();
                  }}
                >
                  <Workflow size={13} /> Decision DAG Tree
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="report-grid">
                  {result.constraints.option_assessments.map((assessment, index) => (
                    <AssessmentCard
                      key={assessment.option_id}
                      assessment={assessment}
                      narrative={result.narrative.option_analyses.find(n => n.option_id === assessment.option_id)}
                      index={index}
                      weeklyCapacity={result.constraints.weekly_capacity_hours}
                      totalBudget={result.constraints.option_assessments[0]?.projected_available_budget_npr}
                      horizon={result.constraints.time_horizon_months}
                      onConsultFutureSelf={() => handleConsultFutureSelf(assessment.option_id)}
                      onVisualizeOption={() => {
                        const opt = draft.options.find(o => o.id === assessment.option_id);
                        if (opt) handleVisualizeOption(opt);
                      }}
                      visualScene={visualScenes[assessment.option_id]}
                      visualLoading={visualLoading[assessment.option_id]}
                    />
                  ))}
                  <div className="report-panel full-width">
                    <div className="panel-title"><Wallet size={16} /><h3>Shared constraint ledger</h3></div>
                    <div className="metric-grid">
                      <Metric label="Weekly discretionary capacity" value={hours(result.constraints.weekly_capacity_hours)} badge="prov-calc" />
                      <Metric label="Available funds over horizon" value={money(result.constraints.option_assessments[0]?.projected_available_budget_npr)} badge="prov-calc" />
                      <Metric label="Horizon" value={`${result.constraints.time_horizon_months} months`} badge="prov-fact" />
                      <Metric label="Overall constraint status" value={statusText(result.constraints.overall_status)} />
                    </div>
                    <p className="calculation-note">{result.constraints.arithmetic_policy}</p>
                  </div>
                  <div className="report-panel">
                    <div className="panel-title"><CircleAlert size={16} /><h3>Unresolved unknowns</h3></div>
                    {result.constraints.important_unknowns.length ? (
                      <ul className="clean-list">
                        {result.constraints.important_unknowns.map((item, i) => <li key={i}>{item}</li>)}
                      </ul>
                    ) : (
                      <p className="muted-copy">No additional unknowns entered.</p>
                    )}
                    {result.constraints.missing_inputs.length > 0 && (
                      <div className="missing-box">
                        <strong>Missing required inputs:</strong>
                        {result.constraints.missing_inputs.map(x => <span key={x}>{x.replaceAll('_', ' ')}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="report-panel">
                    <div className="panel-title"><FlaskConical size={16} /><h3>Recommended reversible experiment</h3></div>
                    <p>{result.narrative.reversible_experiment}</p>

                    <div className="experiment-framework">
                      <div className="exp-step">
                        <span><Target size={12} /> 1. Target Unknown</span>
                        <p>{result.constraints.important_unknowns[0] || 'Core workload flexibility'}</p>
                      </div>
                      <div className="exp-step">
                        <span><Zap size={12} /> 2. 2-Week Action</span>
                        <p>Time audit / conversation before signing any commitments.</p>
                      </div>
                      <div className="exp-step">
                        <span><CircleAlert size={12} /> 3. Pivot Trigger</span>
                        <p>Negative headroom or supervisor rejection of flexible cap.</p>
                      </div>
                    </div>

                    <div className="divider-line" />
                    <h4>Questions to answer before deciding:</h4>
                    <ul className="clean-list">
                      {result.narrative.questions_before_deciding.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'comparison' && (
                <div className="report-panel full-width">
                  <div className="panel-title"><Table size={16} /><h3>Comparative Constraints Matrix</h3></div>
                  <p>Direct side-by-side comparison of deterministic metrics across every evaluated option.</p>
                  <div className="comparison-table-wrapper">
                    <table className="comparison-table">
                      <thead>
                        <tr>
                          <th>Path</th>
                          <th>Overall Feasibility</th>
                          <th>Time Required</th>
                          <th>Weekly Headroom</th>
                          <th>Upfront Cost</th>
                          <th>Monthly Cost</th>
                          <th>Total Cost ({result.constraints.time_horizon_months}m)</th>
                          <th>Budget Headroom</th>
                          <th>Runway</th>
                          <th>Breakeven Surplus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.constraints.option_assessments.map(opt => (
                          <tr key={opt.option_id}>
                            <td><strong>{opt.option_name}</strong></td>
                            <td>
                              <span className={`badge-cell ${opt.overall_status.toLowerCase()}`}>
                                {opt.overall_status}
                              </span>
                            </td>
                            <td>{hours(opt.required_hours_per_week)}</td>
                            <td>
                              <strong className={opt.time_status === 'CONFLICT' ? 'negative' : ''}>
                                {hours(opt.weekly_headroom_hours)}
                              </strong>
                            </td>
                            <td>{money(opt.projected_total_cost_npr !== null ? (opt.projected_total_cost_npr - (opt.required_hours_per_week || 0)) : null)}</td>
                            <td>{money(opt.projected_total_cost_npr ? Math.round(opt.projected_total_cost_npr / result.constraints.time_horizon_months) : null)}</td>
                            <td>{money(opt.projected_total_cost_npr)}</td>
                            <td>
                              <strong className={opt.money_status === 'CONFLICT' ? 'negative' : ''}>
                                {money(opt.projected_budget_headroom_npr)}
                              </strong>
                            </td>
                            <td>{opt.runway_months !== null && opt.runway_months !== undefined ? `${opt.runway_months} mo` : 'Indefinite / N/A'}</td>
                            <td>{opt.breakeven_monthly_surplus_npr !== null && opt.breakeven_monthly_surplus_npr !== undefined ? money(opt.breakeven_monthly_surplus_npr) : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* What-If Sandbox */}
                  <div className="whatif-sandbox">
                    <div className="sandbox-header">
                      <h4><Workflow size={16} /> Interactive What-If Sensitivity Sandbox</h4>
                      <button
                        type="button"
                        className="stale-btn-rerun"
                        onClick={handleApplyWhatIfSandbox}
                        disabled={recalcLoading}
                      >
                        {recalcLoading ? <LoaderCircle className="spin" size={13} /> : <Zap size={13} />} Test What-If Overrides
                      </button>
                    </div>
                    <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      Change personal baseline assumptions below to see instant deterministic recalculation and headroom delta.
                    </p>
                    <div className="sandbox-grid">
                      <div className="sandbox-field">
                        <label>Weekly Maintenance (h)</label>
                        <input
                          type="number"
                          value={whatIfMaintenance}
                          onChange={e => setWhatIfMaintenance(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="sandbox-field">
                        <label>Existing Commitments (h)</label>
                        <input
                          type="number"
                          value={whatIfCommitments}
                          onChange={e => setWhatIfCommitments(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="sandbox-field">
                        <label>Liquid Savings (NPR)</label>
                        <input
                          type="number"
                          value={whatIfSavings}
                          onChange={e => setWhatIfSavings(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                      <div className="sandbox-field">
                        <label>Monthly Surplus (NPR)</label>
                        <input
                          type="number"
                          value={whatIfSurplus}
                          onChange={e => setWhatIfSurplus(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {recalcDiff && (
                      <div className="diff-card">
                        <div className="diff-header">
                          <Check size={14} /> Recalculation Results: What Changed & Why
                        </div>
                        <div className="diff-content">
                          <div className="diff-col">
                            <h5>Assumption Changes</h5>
                            <ul className="diff-list">
                              {Object.entries(recalcDiff.changed_assumptions).map(([key, val]) => (
                                <li key={key}>
                                  <strong>{key.replaceAll('_', ' ')}:</strong> {String(val.previous)} → {String(val.updated)}
                                </li>
                              ))}
                              {recalcDiff.capacity_delta_hours !== null && (
                                <li>
                                  <strong>Capacity Delta:</strong>{' '}
                                  <span className={`delta-tag ${recalcDiff.capacity_delta_hours >= 0 ? 'delta-pos' : 'delta-neg'}`}>
                                    {recalcDiff.capacity_delta_hours >= 0 ? `+${recalcDiff.capacity_delta_hours}h` : `${recalcDiff.capacity_delta_hours}h`}
                                  </span>
                                </li>
                              )}
                            </ul>
                          </div>
                          <div className="diff-col">
                            <h5>Impact on Options</h5>
                            <ul className="diff-list">
                              {Object.entries(recalcDiff.option_deltas).map(([optId, delta]) => {
                                const optName = result.constraints.option_assessments.find(a => a.option_id === optId)?.option_name || optId;
                                return (
                                  <li key={optId}>
                                    <strong>{optName}:</strong> Time delta{' '}
                                    <span className={`delta-tag ${(delta.time_headroom_delta_hours || 0) >= 0 ? 'delta-pos' : 'delta-neg'}`}>
                                      {(delta.time_headroom_delta_hours || 0) >= 0 ? `+${delta.time_headroom_delta_hours}h` : `${delta.time_headroom_delta_hours}h`}
                                    </span>
                                    {delta.status_changed && (
                                      <span style={{ marginLeft: 6, color: 'var(--rose)' }}>
                                        ({delta.previous_status} → {delta.updated_status})
                                      </span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'facts' && (
                <div className="report-panel full-width">
                  <div className="panel-title"><Layers size={16} /><h3>Grounded Facts vs User Assumptions</h3></div>
                  <p>Antevorta strictly separates verified mathematical realities from subjective inputs provided by the user.</p>
                  <div className="facts-assumptions-grid">
                    <div className="fact-card">
                      <h4><span className="prov-badge prov-fact">FACT</span> Verified Parameters & Stated Facts</h4>
                      <ul className="clean-list">
                        {(result.constraints.known_facts && result.constraints.known_facts.length > 0) ? (
                          result.constraints.known_facts.map((fact, i) => <li key={i}>{fact}</li>)
                        ) : (
                          <li>Planning horizon: {result.constraints.time_horizon_months} months</li>
                        )}
                      </ul>
                    </div>
                    <div className="fact-card">
                      <h4><span className="prov-badge prov-unknown">USER ASSUMPTIONS</span> Subjective Capacity Estimates</h4>
                      <ul className="clean-list">
                        {(result.constraints.user_assumptions && result.constraints.user_assumptions.length > 0) ? (
                          result.constraints.user_assumptions.map((assump, i) => <li key={i}>{assump}</li>)
                        ) : (
                          <li>Assumed monthly surplus and maintenance capacity as entered in intake form.</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Person Model (L3) & Revealed Divergence */}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserCheck size={16} />
                        <h4 style={{ margin: 0, fontSize: 14 }}>Person Model (L3 Claims & Exponential Time Decay)</h4>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Half-life decay: w(t) = 0.5^(Δt / 30d)
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                      Longitudinal stated preferences and observed behavioral claims. Claims decay exponentially over time unless reaffirmed, and divergence triggers reflective calibration alerts.
                    </p>

                    {claimDivergences.length > 0 && (
                      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {claimDivergences.map((div, i) => (
                          <div key={i} style={{ padding: 14, background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="prov-badge prov-unknown">DIVERGENCE</span>
                                <strong style={{ fontSize: 13, color: 'var(--amber)' }}>{div.title}</strong>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                Stated: {div.stated_description} vs Revealed: {div.revealed_description} (Δ: {(div.divergence_score * 100).toFixed(0)}%)
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>{div.recommended_inquiry}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {userClaims.length === 0 ? (
                      <div style={{ padding: 18, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        No persistent claims saved yet. Sign in to track longitudinal calibration and personality decay.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                        {userClaims.map(claim => (
                          <div key={claim.id} style={{ padding: 14, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border)', borderRadius: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <span style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>{claim.domain}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', font: '10px var(--mono)' }}>Weight: {(claim.effective_support * 100).toFixed(0)}%</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.5 }}>{claim.predicate}: {claim.object}</p>
                            <div style={{ background: 'rgba(148, 163, 184, 0.12)', height: 5, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
                              <div style={{ width: `${claim.effective_support * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent) 0%, var(--emerald) 100%)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="text-button"
                                style={{ padding: '3px 10px', fontSize: 10 }}
                                onClick={async () => {
                                  if (userToken) {
                                    await disputeClaim(userToken, claim.id);
                                    loadCalibrationAndClaims(userToken);
                                  }
                                }}
                              >
                                Dispute
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                style={{ padding: '3px 10px', fontSize: 10, borderColor: 'var(--rose-border)', color: 'var(--rose-light)', background: 'var(--rose-bg)' }}
                                onClick={async () => {
                                  if (userToken) {
                                    await excludeClaim(userToken, claim.id);
                                    loadCalibrationAndClaims(userToken);
                                  }
                                }}
                              >
                                Exclude
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'scenarios' && (
                <div className="scenario-stack">
                  <div className="conditional-banner">
                    <GitBranch size={17} />
                    <div>
                      <strong><span className="prov-badge prov-scenario">CONDITIONAL SCENARIOS</span> Grounded in Stated Assumptions</strong>
                      <p>Each scenario describes what to investigate under stated conditions. It does not claim to know the future.</p>
                    </div>
                  </div>
                  {result.narrative.option_analyses.map((narrative, index) => {
                    const assessment = assessmentById.get(narrative.option_id);
                    return (
                      <article className="scenario-panel" key={narrative.option_id}>
                        <div className="scenario-head">
                          <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                          <div>
                            <span className="label-upper">PATH {String(index + 1).padStart(2, '0')}</span>
                            <h3>{assessment?.option_name || narrative.option_id}</h3>
                          </div>
                          {assessment && <StatusPill status={assessment.overall_status} />}
                        </div>
                        <div className="scenario-columns">
                          <div>
                            <h4>Potential upside</h4>
                            <p>{narrative.potential_upside}</p>
                          </div>
                          <div>
                            <h4>Main trade-off</h4>
                            <p>{narrative.main_tradeoff}</p>
                          </div>
                        </div>
                        <div className="scenario-columns lower">
                          <div>
                            <h4>Conditions to make it work</h4>
                            <ul className="clean-list">
                              {narrative.conditions_to_make_it_work.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4>Questions to resolve</h4>
                            <ul className="clean-list">
                              {narrative.questions_to_resolve.map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  <div className="scenario-footnote">{result.narrative.caveat}</div>
                </div>
              )}

              {activeTab === 'trace' && (
                <div className="trace-panel">
                  <div className="trace-intro">
                    <h3>Execution Trace & Verification Log</h3>
                    <p>Transparent audit distinguishing deterministic engine steps from model-initiated tool invocations.</p>
                  </div>
                  <div className="trace-list">
                    {result.tool_trace.map((item, i) => (
                      <div className="trace-item" key={`${item.tool}-${i}`}>
                        <div className={`trace-status ${item.status}`}>
                          {item.status === 'completed' ? <Check size={15} /> : item.status === 'blocked' ? <ShieldCheck size={15} /> : <CircleAlert size={15} />}
                        </div>
                        <div>
                          <strong>{item.tool.replaceAll('_', ' ')}</strong>
                          <p>{item.detail}</p>
                        </div>
                        <span className={`trace-label ${item.status}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="provider-note">
                    <strong>Provider status</strong>
                    <p>{result.provider_status}</p>
                    <small>Generated {new Date(result.generated_at).toLocaleString()}</small>
                  </div>
                </div>
              )}

              {activeTab === 'clarifications' && (
                <div className="trace-panel">
                  <div className="trace-intro">
                    <h3>Adaptive Clarifications</h3>
                    <p>Identifies incomplete inputs, missing financial buffers, and unverified assumptions with suggested one-click patches.</p>
                  </div>
                  {(!result.clarifications || result.clarifications.length === 0) ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--emerald)' }}>
                      <Check size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                      All core assumptions and constraints are fully specified. No critical gaps identified!
                    </div>
                  ) : (
                    <div className="clarity-prompts-list">
                      {result.clarifications.map(prompt => (
                        <div key={prompt.id} className="clarity-prompt-item">
                          <div className="clarity-prompt-title">{prompt.question}</div>
                          <div className="clarity-prompt-why">{prompt.why_it_matters}</div>
                          <div className="clarity-prompt-action-row">
                            <span className="clarity-prompt-hint">{prompt.suggested_action}</span>
                            {Object.keys(prompt.suggested_patch).length > 0 && (
                              <button
                                type="button"
                                className="btn-apply-patch"
                                onClick={() => {
                                  applyClarificationPatch(prompt.suggested_patch);
                                  handleQuickRecalculate();
                                }}
                              >
                                <Zap size={12} /> Apply Assumption & Recalculate
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="audit-container">
                  <div className={`audit-badge-card ${result.verification_report?.audit_status === 'VERIFIED_HYBRID' ? 'hybrid' : ''}`}>
                    <div className="audit-status-title">
                      <ShieldCheck size={18} color="var(--green)" />
                      <span>
                        Verification Audit:{' '}
                        {result.verification_report?.audit_status === 'VERIFIED_HYBRID'
                          ? 'Grounded Tool-Assisted Analysis (Meta API + Constraint Engine)'
                          : 'Deterministic Safe Fallback (100% Arithmetic Engine)'}
                      </span>
                    </div>
                    <ul className="audit-checks-list">
                      <li className="audit-check-item">
                        <Check size={14} color="var(--green)" />
                        <strong>Zero Hallucination Arithmetic:</strong> All hours, costs, and headroom values strictly computed by deterministic Python engine; no synthetic numbers invented in narratives.
                      </li>
                      <li className="audit-check-item">
                        <Check size={14} color="var(--green)" />
                        <strong>Prohibited Unsupported Probabilities:</strong> Model narratives are programmatically scanned and scrubbed of fake percentage chances or success odds.
                      </li>
                      <li className="audit-check-item">
                        <Check size={14} color="var(--green)" />
                        <strong>Option Parity & Coverage:</strong> Exactly all {result.constraints.option_assessments.length} candidate options evaluated without omission.
                      </li>
                      {result.verification_report?.verification_details?.map((detail, idx) => (
                        <li key={idx} className="audit-check-item">
                          <CheckCircle2 size={13} color="var(--emerald)" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="trace-panel">
                    <div className="trace-intro">
                      <h3>Grounded External Sources & Benchmarks</h3>
                      <p>Verified public reference-class data. Never synthetically fabricated.</p>
                    </div>
                    {(!result.grounded_citations || result.grounded_citations.length === 0) ? (
                      <div style={{ padding: '16px', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                        <Info size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        No external benchmark citations were required or matched for this personal decision query. Calculations reflect only your supplied inputs without ungrounded web claims.
                      </div>
                    ) : (
                      <div className="citations-panel">
                        {result.grounded_citations.map((cite, i) => (
                          <div key={i} className="citation-card">
                            <div className="citation-header">
                              <span className="citation-source">{cite.source_name}</span>
                              <a href={cite.url} target="_blank" rel="noopener noreferrer" className="citation-link">
                                Source Reference <ExternalLink size={12} />
                              </a>
                            </div>
                            <p className="citation-snippet">&ldquo;{cite.snippet}&rdquo;</p>
                            <span className="citation-meta">Retrieved & verified: {cite.retrieval_timestamp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'dag' && (
                <div className="report-panel full-width">
                  <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Workflow size={16} />
                      <h3>Directed Acyclic Graph (DAG) Decision Tree</h3>
                    </div>
                    <button
                      type="button"
                      className="btn-opt-action"
                      onClick={handleFetchDAG}
                      disabled={dagLoading}
                    >
                      {dagLoading ? <LoaderCircle size={12} className="spin" /> : <RefreshCw size={12} />} Refresh DAG
                    </button>
                  </div>
                  <p style={{ margin: '0 0 14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Topological breakdown of your decision problem: root decision &rarr; candidate options &rarr; prerequisites &rarr; constraints &rarr; simulated outcomes &rarr; reversible experiment gate.
                  </p>

                  {dagData?.critical_bottlenecks && dagData.critical_bottlenecks.length > 0 && (
                    <div className="dag-bottleneck-alert" style={{ marginBottom: 16, padding: '14px 18px', background: 'var(--rose-bg)', border: '1px solid var(--rose-border)', borderRadius: 12 }}>
                      <strong style={{ color: 'var(--rose-light)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
                        <CircleAlert size={15} /> Critical Bottlenecks Identified:
                      </strong>
                      <ul style={{ margin: '8px 0 0 20px', padding: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {dagData.critical_bottlenecks.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    </div>
                  )}

                  {dagLoading && !dagData ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--accent)' }}>
                      <LoaderCircle size={28} className="spin" style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: 13, fontWeight: 500 }}>Computing topological DAG coordinates...</div>
                    </div>
                  ) : dagData ? (
                    <div className="dag-container" style={{ background: 'rgba(9, 14, 24, 0.85)', borderRadius: 14, border: '1px solid var(--border)', padding: 20, overflowX: 'auto' }}>
                      <svg viewBox="0 0 1000 650" style={{ width: '100%', minWidth: 800, height: 480, display: 'block' }}>
                        <defs>
                          <marker id="arrow-green" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                          </marker>
                          <marker id="arrow-red" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                          </marker>
                          <marker id="arrow-yellow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                          </marker>
                          <marker id="arrow-neutral" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(148, 163, 184, 0.4)" />
                          </marker>
                        </defs>

                        {/* Render Edges */}
                        {dagData.edges.map((edge, i) => {
                          const src = dagData.nodes.find(n => n.id === edge.source);
                          const tgt = dagData.nodes.find(n => n.id === edge.target);
                          if (!src || !tgt) return null;
                          const color = edge.status === 'active' ? '#10b981' : edge.status === 'blocked' ? '#f43f5e' : edge.status === 'warning' ? '#fbbf24' : 'rgba(148, 163, 184, 0.4)';
                          const markerId = edge.status === 'active' ? 'url(#arrow-green)' : edge.status === 'blocked' ? 'url(#arrow-red)' : edge.status === 'warning' ? 'url(#arrow-yellow)' : 'url(#arrow-neutral)';
                          return (
                            <g key={i}>
                              <line
                                x1={src.x}
                                y1={src.y}
                                x2={tgt.x}
                                y2={tgt.y}
                                stroke={color}
                                strokeWidth="2"
                                strokeDasharray={edge.status === 'warning' ? '4 3' : undefined}
                                markerEnd={markerId}
                                opacity="0.85"
                              />
                              {edge.label && (
                                <text
                                  x={(src.x + tgt.x) / 2}
                                  y={(src.y + tgt.y) / 2 - 6}
                                  fill="var(--text-muted)"
                                  fontSize="10"
                                  fontFamily="var(--mono)"
                                  textAnchor="middle"
                                >
                                  {edge.label}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        {/* Render Nodes */}
                        {dagData.nodes.map(node => {
                          const isRoot = node.type === 'decision';
                          const isOpt = node.type === 'option';
                          const strokeColor = node.status === 'FEASIBLE' ? '#10b981' : node.status === 'CONFLICT' ? '#f43f5e' : node.status === 'PENDING' ? '#fbbf24' : node.status === 'VERIFIED' ? '#38bdf8' : 'rgba(148, 163, 184, 0.3)';
                          const fillColor = node.status === 'CONFLICT' ? 'rgba(244, 63, 94, 0.12)' : node.status === 'FEASIBLE' ? 'rgba(16, 185, 129, 0.12)' : node.status === 'VERIFIED' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.85)';
                          const width = isRoot ? 164 : isOpt ? 144 : 132;
                          const height = isRoot ? 56 : isOpt ? 50 : 44;
                          return (
                            <g key={node.id} transform={`translate(${node.x - width / 2}, ${node.y - height / 2})`}>
                              <rect
                                width={width}
                                height={height}
                                rx="8"
                                ry="8"
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth={isRoot || isOpt ? '2' : '1.5'}
                              />
                              <text
                                x={width / 2}
                                y="16"
                                fill="var(--text-muted)"
                                fontSize="8"
                                fontFamily="var(--mono)"
                                fontWeight="bold"
                                textAnchor="middle"
                                letterSpacing="0.08em"
                              >
                                {node.type.toUpperCase()}
                              </text>
                              <text
                                x={width / 2}
                                y="33"
                                fill="var(--text-primary)"
                                fontSize="11"
                                fontFamily="var(--heading)"
                                fontWeight="600"
                                textAnchor="middle"
                              >
                                {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                              </text>
                              {node.status !== 'UNKNOWN' && (
                                <circle
                                  cx={width - 10}
                                  cy="10"
                                  r="4"
                                  fill={strokeColor}
                                />
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {/* Legend */}
                      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }} /> Feasible Path
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px rgba(244, 63, 94, 0.4)' }} /> Constraint Deficit
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)' }} /> Pending Prerequisite
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                      Click &quot;Refresh DAG&quot; to build the dependency tree.
                    </div>
                  )}
                </div>
              )}

              <div className="report-disclaimer">
                <ShieldCheck size={15} />
                <span>{result.narrative.caveat} Antevorta supports your reasoning; it does not make the decision for you.</span>
              </div>
            </>
          )}
        </section>

        {/* Phase 5 Modals */}

        {/* Auth / Register Modal */}
        {showAuthModal && (
          <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}>
            <div className="modal-window" onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><Lock size={18} /> Sign In or Create Private Account</h3>
                <button type="button" className="icon-button" onClick={() => setShowAuthModal(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Antevorta uses private token authentication. Enter your email and a secret token to save decision revisions,
                track assumption changes over time, and protect your choices.
              </p>
              <Field label="Your email address">
                <input
                  type="email"
                  value={authEmailInput}
                  onChange={e => setAuthEmailInput(e.target.value)}
                  placeholder="e.g. you@example.com"
                />
              </Field>
              <Field label="Your secret token (Password / Key)" hint="Must be at least 8 characters.">
                <input
                  type="password"
                  value={authTokenInput}
                  onChange={e => setAuthTokenInput(e.target.value)}
                  placeholder="Enter or create your private key"
                />
              </Field>
              {authError && <div className="error-box" style={{ marginBottom: 14 }}>{authError}</div>}
              <button
                type="button"
                className="analyze-button"
                style={{ height: 42 }}
                onClick={handleAuthSubmit}
              >
                Sign In / Register <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Decision History Modal */}
        {showHistoryModal && (
          <div className="modal-backdrop" onClick={() => setShowHistoryModal(false)}>
            <div className="modal-window" onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><History size={18} /> Decision History & Revisions</h3>
                <button type="button" className="icon-button" onClick={() => setShowHistoryModal(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
                Browse past decisions and inspect earlier versioned assumptions.
              </p>

              {savedDecisionsList.length === 0 ? (
                <p className="muted-copy" style={{ textAlign: 'center', padding: '24px 0' }}>
                  No saved decisions found. Run a stress test and click &quot;Save to History&quot;.
                </p>
              ) : (
                <div className="history-list">
                  {savedDecisionsList.map(dec => (
                    <div key={dec.id} className="history-item">
                      <div className="history-item-left">
                        <strong>{dec.title}</strong>
                        <small>Saved: {new Date(dec.updated_at).toLocaleDateString()} · {dec.revision_count} version(s)</small>
                      </div>
                      <div className="history-actions">
                        <button
                          type="button"
                          className="btn-load"
                          onClick={() => handleLoadDecisionDetail(dec.id)}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          className="btn-delete"
                          onClick={() => handleDeleteSavedDecision(dec.id)}
                          title="Delete decision"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {currentDecisionDetail && currentDecisionDetail.revisions.length > 1 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Browse Versions:</span>
                  <div className="revision-pills">
                    {currentDecisionDetail.revisions.map(rev => (
                      <button
                        key={rev.id}
                        type="button"
                        className={`rev-pill ${savedDecisionVersion === rev.version_number ? 'active' : ''}`}
                        onClick={() => handleLoadSpecificRevision(rev)}
                      >
                        v{rev.version_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy & Account Controls Modal */}
        {showPrivacyModal && (
          <div className="modal-backdrop" onClick={() => setShowPrivacyModal(false)}>
            <div className="modal-window" onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><ShieldCheck size={18} /> Privacy & Data Sovereignty</h3>
                <button type="button" className="icon-button" onClick={() => setShowPrivacyModal(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                You have full control over your personal decision records. You can download a complete JSON export of all your
                decisions and revisions, or permanently purge your account from our database.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  type="button"
                  className="text-button"
                  style={{ justifyContent: 'center', height: 40, width: '100%', borderColor: 'var(--border)' }}
                  onClick={handleExportPrivacyData}
                >
                  <Download size={14} /> Export All Personal Data (JSON)
                </button>
                <button
                  type="button"
                  className="text-button"
                  style={{ justifyContent: 'center', height: 40, width: '100%', borderColor: 'var(--rose-border)', color: 'var(--rose)', background: 'var(--rose-bg)' }}
                  onClick={handlePurgeAccountData}
                >
                  <Trash2 size={14} /> Permanently Purge Account & All Decisions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 9 Modals */}

        {/* Future Self Dialogue Modal */}
        {showFutureSelfModal && (
          <div className="modal-backdrop" onClick={() => setShowFutureSelfModal(false)}>
            <div className="modal-window" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><Sparkles size={18} color="var(--violet)" /> Future Self Reflection ({futureSelfResponse?.perspective || '3 Years Out'})</h3>
                <button type="button" className="icon-button" onClick={() => setShowFutureSelfModal(false)}><Trash2 size={14} /></button>
              </div>
              {futureSelfLoading ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--violet)' }}>
                  <LoaderCircle size={28} className="spin" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Synthesizing future perspective with Meta Model API...</div>
                </div>
              ) : futureSelfResponse ? (
                <div>
                  <div style={{ padding: '14px 18px', background: 'rgba(129, 140, 248, 0.08)', border: '1px solid rgba(129, 140, 248, 0.25)', borderRadius: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 10, color: 'var(--violet)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, fontFamily: 'var(--mono)' }}>THE DIALOGUE</span>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: 'var(--text-primary)', marginTop: 8, lineHeight: 1.7, fontStyle: 'italic' }}>
                      {futureSelfResponse.dialogue_transcript}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div style={{ padding: 14, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <strong style={{ fontSize: 11, color: 'var(--rose-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hardest Trade-off Faced:</strong>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.6 }}>
                        {futureSelfResponse.hardest_tradeoff}
                      </p>
                    </div>
                    <div style={{ padding: 14, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border)', borderRadius: 12 }}>
                      <strong style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>What I Wish I Had Known:</strong>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: 1.6 }}>
                        {futureSelfResponse.what_i_wish_i_knew}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: 14, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--emerald-border)', borderRadius: 12, marginBottom: 16 }}>
                    <strong style={{ fontSize: 11, color: 'var(--emerald-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recommended Concrete Micro-Experiment:</strong>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '6px 0 0', lineHeight: 1.6 }}>
                      {futureSelfResponse.recommended_micro_experiment}
                    </p>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--text-soft)', textAlign: 'center', fontStyle: 'italic' }}>
                    {futureSelfResponse.disclaimer}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Voice Intake Modal */}
        {showVoiceModal && (
          <div className="modal-backdrop" onClick={() => setShowVoiceModal(false)}>
            <div className="modal-window" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><Mic size={18} color="var(--accent)" /> Meta Muse Voice Intake & Dilemma Parser</h3>
                <button type="button" className="icon-button" onClick={() => setShowVoiceModal(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Speak or paste your natural language decision dilemma. Meta AI extracts your core question, candidate options, hours, and budgets directly into the mathematical model.
              </p>
              <Field label="Voice Dictation / Spoken Transcript">
                <textarea
                  rows={5}
                  value={voiceText}
                  onChange={e => setVoiceText(e.target.value)}
                  placeholder="e.g. 'I'm torn between joining a high-growth AI startup that requires 50 hours a week with 20k costs, or staying in my current steady consulting role at 35 hours. I have 300,000 savings and 15,000 monthly surplus...'"
                />
              </Field>
              <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
                <button
                  type="button"
                  className="text-button"
                  style={{ fontSize: 11, padding: '5px 10px' }}
                  onClick={() => setVoiceText("I'm deciding whether to accept a seed-stage startup founding engineer role at 55 hours per week with NPR 100,000 upfront equipment costs, or continue my stable remote enterprise job at 38 hours per week with zero upfront cost. My savings are NPR 450,000 and monthly surplus is NPR 25,000.")}
                >
                  Paste Sample Startup vs Enterprise Dilemma
                </button>
              </div>
              <button
                type="button"
                className="analyze-button"
                style={{ height: 44 }}
                onClick={handleVoiceParse}
                disabled={voiceTranscribeLoading || !voiceText.trim()}
              >
                {voiceTranscribeLoading ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />} Parse into Decision Model
              </button>
            </div>
          </div>
        )}

        {/* Calibration Mirror Drawer */}
        {showCalibrationDrawer && (
          <div className="modal-backdrop" onClick={() => setShowCalibrationDrawer(false)}>
            <div className="modal-window" style={{ maxWidth: 680, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={18} color="var(--amber)" />
                  <h3>Calibration Mirror (L4A & Brier Skill Score)</h3>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowCalibrationDrawer(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                Scientific verification: Antevorta measures genuine calibration using the <strong>Brier Skill Score (BSS)</strong>: <code>BSS = 1 - (BS_twin / BS_generic)</code>. Test whether your predictions beat the 50% baseline.
              </p>

              {calibrationReport && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                  <div style={{ padding: 14, background: 'rgba(9, 14, 24, 0.75)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', font: '10px var(--mono)', textTransform: 'uppercase' }}>BRIER SCORE (TWIN)</span>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-primary)', marginTop: 4, font: '700 20px var(--mono)' }}>
                      {calibrationReport.brier_twin !== null ? calibrationReport.brier_twin.toFixed(3) : 'Pending'}
                    </div>
                    <small style={{ fontSize: 10, color: 'var(--text-soft)' }}>Lower is better (0.00 = perfect)</small>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(9, 14, 24, 0.75)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', font: '10px var(--mono)', textTransform: 'uppercase' }}>BRIER SKILL SCORE</span>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: (calibrationReport.brier_skill_score || 0) >= 0 ? 'var(--emerald-light)' : 'var(--rose-light)', marginTop: 4, font: '700 20px var(--mono)' }}>
                      {calibrationReport.brier_skill_score !== null ? `${(calibrationReport.brier_skill_score * 100).toFixed(1)}%` : 'Calibrating'}
                    </div>
                    <small style={{ fontSize: 10, color: 'var(--text-soft)' }}>Vs uncalibrated 50% generic</small>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(9, 14, 24, 0.75)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', font: '10px var(--mono)', textTransform: 'uppercase' }}>RESOLVED / TOTAL</span>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--text-primary)', marginTop: 4, font: '700 20px var(--mono)' }}>
                      {calibrationReport.resolved_predictions} / {calibrationReport.total_predictions}
                    </div>
                    <small style={{ fontSize: 10, color: 'var(--text-soft)' }}>
                      {calibrationReport.accuracy_rate !== null ? `${(calibrationReport.accuracy_rate * 100).toFixed(0)}% accuracy` : 'Awaiting resolutions'}
                    </small>
                  </div>
                </div>
              )}

              {/* Log New Prediction Form */}
              <div style={{ padding: 16, background: 'rgba(9, 14, 24, 0.85)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 18 }}>
                <strong style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginBottom: 10, fontWeight: 700 }}>
                  Log 14-Day Machine-Checkable Commitment
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    type="text"
                    value={newMilestoneText}
                    onChange={e => setNewMilestoneText(e.target.value)}
                    placeholder="Statement (e.g., 'Will spend less than 15 hours on thesis this week')"
                    style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', color: 'var(--text-primary)', fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={newMilestoneCriteria}
                    onChange={e => setNewMilestoneCriteria(e.target.value)}
                    placeholder="Verification criterion (e.g., 'Toggl time-tracking log shows < 15.0h')"
                    style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 13px', color: 'var(--text-primary)', fontSize: 12 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select
                      value={newMilestoneDomain}
                      onChange={e => setNewMilestoneDomain(e.target.value as any)}
                      style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', color: 'var(--text-primary)', fontSize: 11 }}
                    >
                      <option value="follow_through">Follow-through</option>
                      <option value="schedule_boundary">Schedule boundary</option>
                      <option value="coding_milestone">Coding milestone</option>
                      <option value="study_prep">Study prep</option>
                      <option value="financial_buffer">Financial buffer</option>
                    </select>
                    <button
                      type="button"
                      className="analyze-button"
                      style={{ height: 36, padding: '0 18px', fontSize: 11, marginTop: 0 }}
                      onClick={handleCreateMilestone}
                      disabled={!userToken || !newMilestoneText.trim() || !newMilestoneCriteria.trim()}
                    >
                      <Plus size={12} /> Log Commitment
                    </button>
                  </div>
                </div>
              </div>

              {/* Predictions List */}
              <div>
                <strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block', marginBottom: 10, fontWeight: 700 }}>Active & Past Predictions</strong>
                {(!calibrationReport?.predictions || calibrationReport.predictions.length === 0) ? (
                  <div style={{ padding: 18, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No predictions recorded yet. Create one above to begin calibration scoring.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {calibrationReport.predictions.map(pred => {
                      const status = pred.resolved ? (pred.outcome ? 'CONFIRMED_TRUE' : 'CONFIRMED_FALSE') : 'PENDING';
                      return (
                        <div key={pred.id} style={{ padding: 14, background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, font: '10px var(--mono)' }}>{pred.domain} · Horizon {pred.horizon_days}d</span>
                            <span className={`prov-badge ${status === 'CONFIRMED_TRUE' ? 'prov-fact' : status === 'CONFIRMED_FALSE' ? 'prov-unknown' : 'prov-calc'}`}>
                              {status}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.5 }}>{pred.statement}</p>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Criteria: {pred.resolution_criteria}</div>
                          {!pred.resolved && (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="text-button"
                                style={{ padding: '4px 12px', fontSize: 11, borderColor: 'var(--emerald-border)', color: 'var(--emerald-light)', background: 'var(--emerald-bg)' }}
                                onClick={() => handleResolveMilestone(pred.id, true)}
                              >
                                ✓ Confirmed True
                              </button>
                              <button
                                type="button"
                                className="text-button"
                                style={{ padding: '4px 12px', fontSize: 11, borderColor: 'var(--rose-border)', color: 'var(--rose-light)', background: 'var(--rose-bg)' }}
                                onClick={() => handleResolveMilestone(pred.id, false)}
                              >
                                ✗ Missed / False
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Decision Memo Modal */}
        {showShareModal && result && (
          <div className="modal-backdrop" onClick={() => setShowShareModal(false)}>
            <div className="modal-window" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
              <div className="modal-title-row">
                <h3><Share2 size={18} color="var(--emerald)" /> Decision Memo Brief</h3>
                <button type="button" className="icon-button" onClick={() => setShowShareModal(false)}><Trash2 size={14} /></button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                Structured executive brief ready to share with mentors, advisors, or on social media.
              </p>
              <textarea
                rows={12}
                readOnly
                style={{ width: '100%', background: 'rgba(9, 14, 24, 0.95)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}
                value={`# ANTEVORTA DECISION BRIEF: ${draft.question}\nPlanning Horizon: ${result.constraints.time_horizon_months} months\nStatus: ${result.constraints.overall_status}\n\n## Evaluated Options:\n` +
                  result.constraints.option_assessments.map((a, i) => `${i + 1}. ${a.option_name}\n   - Feasibility: ${a.overall_status}\n   - Time Headroom: ${hours(a.weekly_headroom_hours)}\n   - Budget Headroom: ${money(a.projected_budget_headroom_npr)}\n   - Runway: ${a.runway_months !== null ? `${a.runway_months} mo` : 'Indefinite'}`).join('\n\n') +
                  `\n\n## Recommended Reversible Experiment:\n${result.narrative.reversible_experiment}\n\nBuilt with Antevorta & Meta Model API for #MetaAIHackathon\n"Test your decisions before you live them."`}
              />
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="analyze-button"
                  style={{ flex: 1, height: 40 }}
                  onClick={() => {
                    const brief = `# ANTEVORTA DECISION BRIEF: ${draft.question}\nPlanning Horizon: ${result.constraints.time_horizon_months} months\nStatus: ${result.constraints.overall_status}\n\n## Evaluated Options:\n` +
                      result.constraints.option_assessments.map((a, i) => `${i + 1}. ${a.option_name} (${a.overall_status})\n   Time: ${hours(a.weekly_headroom_hours)} | Budget: ${money(a.projected_budget_headroom_npr)}`).join('\n') +
                      `\n\n## Recommended Reversible Experiment:\n${result.narrative.reversible_experiment}\n\nBuilt with Antevorta for #MetaAIHackathon`;
                    navigator.clipboard.writeText(brief);
                    setNotice('Decision memo copied to clipboard!');
                    window.setTimeout(() => setNotice(''), 3000);
                  }}
                >
                  <Bookmark size={14} /> Copy to Clipboard
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Testing my life decision before living it with Antevorta! 🧭 Verified using @MetaAI Muse Spark on Meta Model API. #MetaAIHackathon`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-button"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 40, borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  <Share2 size={14} /> Share on X
                </a>
              </div>
            </div>
          </div>
        )}

        <footer className="footer">
          <a className="brand footer-brand" href="#top">
            <span className="brand-icon"><Compass size={18} /></span>
            <span className="brand-word">antevorta<span className="brand-period">.</span></span>
          </a>
          <span>TEST YOUR DECISIONS BEFORE YOU LIVE THEM.</span>
          <span className="footer-build">META GLOBAL AI DEVELOPER HACKATHON · BUILD 01</span>
        </footer>
      </main>
    </div>
  );
}

function Metric({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="metric">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{label}</span>
        {badge && <span className={`prov-badge ${badge}`}>{badge === 'prov-calc' ? 'CALC' : 'FACT'}</span>}
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function AssessmentCard({
  assessment,
  narrative,
  index,
  weeklyCapacity,
  totalBudget,
  horizon,
  onConsultFutureSelf,
  onVisualizeOption,
  visualScene,
  visualLoading,
}: {
  assessment: OptionAssessment;
  narrative?: AnalysisResponse['narrative']['option_analyses'][number];
  index: number;
  weeklyCapacity?: number | null;
  totalBudget?: number | null;
  horizon: number;
  onConsultFutureSelf?: () => void;
  onVisualizeOption?: () => void;
  visualScene?: VisualScenarioResponse;
  visualLoading?: boolean;
}) {
  const hasTimeConflict = assessment.time_status === 'CONFLICT';
  const hasMoneyConflict = assessment.money_status === 'CONFLICT';

  return (
    <article className="assessment-card">
      <div className="assessment-top">
        <span className="option-letter">{String.fromCharCode(65 + index)}</span>
        <span className="label-upper">OPTION {index + 1}</span>
        <StatusPill status={assessment.overall_status} />
      </div>
      <h3>{assessment.option_name}</h3>
      <div className="assessment-metrics">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Time headroom</span>
            <span className="prov-badge prov-calc">MATH</span>
          </div>
          <strong className={hasTimeConflict ? 'negative' : ''}>
            {hours(assessment.weekly_headroom_hours)}
          </strong>
          <small>{assessment.time_status.toLowerCase()}</small>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Budget headroom</span>
            <span className="prov-badge prov-calc">MATH</span>
          </div>
          <strong className={hasMoneyConflict ? 'negative' : ''}>
            {money(assessment.projected_budget_headroom_npr)}
          </strong>
          <small>{assessment.money_status.toLowerCase()}</small>
        </div>
      </div>

      <p className="assessment-explanation">{assessment.explanation}</p>

      {/* Math-grounded Conflict Resolution Guide */}
      {(hasTimeConflict || hasMoneyConflict) && (
        <div className="conflict-guide">
          <strong>⚠️ Constraint Conflict Resolution:</strong>
          {hasTimeConflict && assessment.weekly_headroom_hours !== null && (
            <p>
              • Weekly time deficit: <strong>{Math.abs(assessment.weekly_headroom_hours)} hours</strong>.
              To make feasible, reduce option hours to &le; {weeklyCapacity}h/week, or reduce existing commitments.
            </p>
          )}
          {hasMoneyConflict && assessment.projected_budget_headroom_npr !== null && (
            <p>
              • Budget deficit over {horizon}m: <strong>{money(Math.abs(assessment.projected_budget_headroom_npr))}</strong>.
              To balance, increase monthly surplus to at least {money(assessment.breakeven_monthly_surplus_npr)}/mo, or reduce upfront costs.
            </p>
          )}
        </div>
      )}

      {narrative && (
        <div className="assessment-upside">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mini-label">THE TRADE-OFF</span>
            <span className="prov-badge prov-scenario">SCENARIO</span>
          </div>
          <p>{narrative.main_tradeoff}</p>
        </div>
      )}

      {/* Future Self & Visual Day in the Life Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          className="text-button"
          style={{ flex: 1, padding: '6px 10px', fontSize: 11, borderColor: 'rgba(129, 140, 248, 0.4)', color: 'var(--violet)', background: 'var(--violet-bg)', borderRadius: 8 }}
          onClick={onConsultFutureSelf}
          title="Consult 3-Year Future Self powered by Meta Model API"
        >
          <Sparkles size={12} /> Consult Future Self
        </button>
        <button
          type="button"
          className="text-button"
          style={{ flex: 1, padding: '6px 10px', fontSize: 11, borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--accent)', background: 'var(--accent-glow)', borderRadius: 8 }}
          onClick={onVisualizeOption}
          disabled={visualLoading}
          title="Synthesize Day-in-the-Life Visual Preview with Meta Muse Image"
        >
          {visualLoading ? <LoaderCircle size={12} className="spin" /> : <ImageIcon size={12} />} Day-in-the-Life
        </button>
      </div>

      {visualScene && (
        <div style={{ marginTop: 14, padding: 14, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ImageIcon size={13} /> Day in the Life Simulation
            </span>
            <span className="prov-badge prov-scenario">MUSE IMAGE</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.6 }}>
            {visualScene.visual_narrative}
          </p>
          <div style={{ fontSize: 11, color: 'var(--text-soft)', fontStyle: 'italic' }}>
            Prompt: {visualScene.prompt_used.slice(0, 100)}...
          </div>
        </div>
      )}

      {assessment.verified_prerequisites && assessment.verified_prerequisites.length > 0 && (
        <div className="prereq-tags" style={{ marginBottom: 6 }}>
          {assessment.verified_prerequisites.map((item, i) => (
            <span key={i} style={{ borderColor: 'var(--emerald-border)', color: 'var(--emerald-light)', background: 'var(--emerald-bg)' }}>
              ✓ {item}
            </span>
          ))}
        </div>
      )}
      {assessment.prerequisites_to_verify.length > 0 && (
        <div className="prereq-tags">
          {assessment.prerequisites_to_verify.map((item, i) => (
            <span key={i} style={{ borderColor: 'var(--amber-border)', color: 'var(--amber)', background: 'var(--amber-bg)' }}>
              ⏳ Verify: {item}
            </span>
          ))}
        </div>
      )}
      {assessment.runway_months !== null && assessment.runway_months !== undefined && (
        <div style={{ marginTop: 10, fontSize: '11px', color: 'var(--rose-light)' }}>
          ⚠️ Estimated financial runway: <strong>{assessment.runway_months} months</strong> before savings deplete.
        </div>
      )}
      {assessment.breakeven_monthly_surplus_npr !== null && assessment.breakeven_monthly_surplus_npr !== undefined && (
        <div style={{ marginTop: 6, fontSize: '10px', color: 'var(--text-muted)' }}>
          Breakeven monthly surplus required: <strong>{money(assessment.breakeven_monthly_surplus_npr)}/mo</strong>
        </div>
      )}
      {assessment.missing_fields.length > 0 && (
        <div className="missing-inline">
          <CircleAlert size={13} /> {assessment.missing_fields.length} missing value(s)
        </div>
      )}
    </article>
  );
}
