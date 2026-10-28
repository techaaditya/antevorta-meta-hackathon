import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, Bookmark, Check, CheckSquare, CircleAlert,
  Clock3, Compass, Download, FileText, FlaskConical, GitBranch, History, Info, KeyRound,
  Layers, LoaderCircle, Lock, LogOut, Plus, RefreshCw, ShieldCheck, Sparkles, Square,
  Table, Target, Trash2, UserCheck, Wallet, WandSparkles, Workflow, Zap,
} from 'lucide-react';
import {
  analyzeDecision, getMetaStatus, recalculateConstraints,
  registerUserAccount, getCurrentUser, saveDecision, addDecisionRevision,
  listDecisions, getDecision, deleteDecision, exportAllUserData, purgeAccount,
} from './api';
import type {
  AnalysisResponse, DecisionInput, OptionAssessment, OptionInput, RecalculateDiff,
  SavedDecisionSummary, SavedDecisionDetail,
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
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'facts' | 'scenarios' | 'trace'>('overview');
  const [notice, setNotice] = useState('');
  const [activePreset, setActivePreset] = useState<string>('academic');

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
      getCurrentUser(userToken).catch(() => {
        // Token expired/invalid
        localStorage.removeItem('antevorta_user_token');
        localStorage.removeItem('antevorta_user_email');
        setUserToken('');
        setUserEmail('');
      });
    }
  }, [userToken]);

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
    setNotice('Initialized blank form. Fill in your question, capacity constraints, and at least 2 options.');
    window.setTimeout(() => setNotice(''), 3600);
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
                <div className="notice-box" style={{ background: '#261715', borderColor: '#683f3a', color: '#f2a6a0' }}>
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
                  style={{ background: '#1c2e21', borderColor: 'var(--green)', color: 'var(--green)' }}
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
                <span style={{ fontWeight: 600, color: '#c3d4c6' }}><Info size={13} /> Claim Provenance:</span>
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
                    <p style={{ margin: '0 0 14px', fontSize: '11px', color: '#97aba0' }}>
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
                                      <span style={{ marginLeft: 6, color: '#f0b094' }}>
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
              <p style={{ fontSize: '11px', color: '#97ab9b', margin: '0 0 16px', lineHeight: 1.6 }}>
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
              <p style={{ fontSize: '11px', color: '#97ab9b', margin: '0 0 14px' }}>
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
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #28372d' }}>
                  <span style={{ fontSize: '11px', color: '#90a595', fontWeight: 600 }}>Browse Versions:</span>
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
              <p style={{ fontSize: '11px', color: '#97ab9b', margin: '0 0 16px', lineHeight: 1.6 }}>
                You have full control over your personal decision records. You can download a complete JSON export of all your
                decisions and revisions, or permanently purge your account from our database.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  type="button"
                  className="text-button"
                  style={{ justifyContent: 'center', height: 40, width: '100%', borderColor: '#3a5441' }}
                  onClick={handleExportPrivacyData}
                >
                  <Download size={14} /> Export All Personal Data (JSON)
                </button>
                <button
                  type="button"
                  className="text-button"
                  style={{ justifyContent: 'center', height: 40, width: '100%', borderColor: '#683632', color: '#f09d94', background: '#251514' }}
                  onClick={handlePurgeAccountData}
                >
                  <Trash2 size={14} /> Permanently Purge Account & All Decisions
                </button>
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
}: {
  assessment: OptionAssessment;
  narrative?: AnalysisResponse['narrative']['option_analyses'][number];
  index: number;
  weeklyCapacity?: number | null;
  totalBudget?: number | null;
  horizon: number;
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

      {assessment.verified_prerequisites && assessment.verified_prerequisites.length > 0 && (
        <div className="prereq-tags" style={{ marginBottom: 6 }}>
          {assessment.verified_prerequisites.map((item, i) => (
            <span key={i} style={{ borderColor: '#3a6642', color: '#a2d6a9' }}>
              ✓ {item}
            </span>
          ))}
        </div>
      )}
      {assessment.prerequisites_to_verify.length > 0 && (
        <div className="prereq-tags">
          {assessment.prerequisites_to_verify.map((item, i) => (
            <span key={i} style={{ borderColor: '#5e4c30', color: '#dec58d' }}>
              ⏳ Verify: {item}
            </span>
          ))}
        </div>
      )}
      {assessment.runway_months !== null && assessment.runway_months !== undefined && (
        <div style={{ marginTop: 10, fontSize: '10px', color: '#f0ad9e' }}>
          ⚠️ Estimated financial runway: <strong>{assessment.runway_months} months</strong> before savings deplete.
        </div>
      )}
      {assessment.breakeven_monthly_surplus_npr !== null && assessment.breakeven_monthly_surplus_npr !== undefined && (
        <div style={{ marginTop: 6, fontSize: '10px', color: '#a2bfa7' }}>
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
