import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Activity, ArrowDownRight, ArrowRight, Check, CircleAlert,
  Clock3, Compass, Download, FlaskConical, GitBranch, KeyRound, LoaderCircle,
  Plus, RefreshCw, ShieldCheck, Sparkles, Trash2, Wallet, WandSparkles, Workflow,
} from 'lucide-react';
import { analyzeDecision, getMetaStatus } from './api';
import type { AnalysisResponse, DecisionInput, OptionAssessment, OptionInput } from './types';

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
      id: 'option_research', name: 'Research + graduate applications',
      description: 'Protect time for research, build an academic profile, and prepare postgraduate applications.',
      required_hours_per_week: 28, upfront_cost_npr: 120000, monthly_cost_npr: 10000,
      prerequisites: ['Confirm funding or scholarship options', 'Clarify application and thesis deadlines'],
      unknowns: ['Funding availability', 'Supervisor response time'],
    },
    {
      id: 'option_contract', name: 'Full-time contract + thesis',
      description: 'Take paid work while continuing thesis work outside work hours.',
      required_hours_per_week: 48, upfront_cost_npr: 25000, monthly_cost_npr: 15000,
      prerequisites: ['Confirm actual weekly workload', 'Negotiate thesis-protected hours'],
      unknowns: ['Whether the contract workload is flexible'],
    },
  ],
  important_unknowns: ['Actual weekly workload of the contract', 'Funding and total cost of graduate applications'],
  reversible_experiment: 'Ask both the prospective supervisor and employer for a concrete two-week workload plan before committing.',
  criteria: ['Time feasibility', 'Financial feasibility', 'Research progress', 'Reversibility'],
};

function cloneDraft(draft: DecisionInput): DecisionInput {
  return { ...draft, options: draft.options.map(o => ({ ...o, prerequisites: [...o.prerequisites], unknowns: [...o.unknowns] })), important_unknowns: [...draft.important_unknowns], criteria: [...draft.criteria] };
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
  return <span className={`status-pill ${status.toLowerCase()}`}><span className="status-dot" />{statusText(status)}</span>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export default function App() {
  const [draft, setDraft] = useState<DecisionInput>(() => cloneDraft(initialDraft));
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metaStatus, setMetaStatus] = useState<{ configured: boolean; model_id: string | null; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'trace'>('overview');
  const [notice, setNotice] = useState('');

  useEffect(() => { getMetaStatus().then(setMetaStatus).catch(() => setMetaStatus(null)); }, []);

  const updateOption = useCallback((id: string, field: keyof OptionInput, value: unknown) => {
    setDraft(current => ({ ...current, options: current.options.map(option => option.id === id ? { ...option, [field]: value } as OptionInput : option) }));
  }, []);

  const loadExample = () => {
    setDraft(cloneDraft(initialDraft)); setResult(null); setError(''); setNotice('Loaded the labelled sample decision. Edit any assumption and rerun the stress test.');
    window.setTimeout(() => setNotice(''), 3600);
  };

  const addOption = () => {
    if (draft.options.length >= 3) return;
    const option: OptionInput = {
      id: 'option_alternative', name: 'Alternative path', description: '',
      required_hours_per_week: null, upfront_cost_npr: null, monthly_cost_npr: null,
      prerequisites: [], unknowns: [],
    };
    setDraft(current => ({ ...current, options: [...current.options, option] }));
  };

  const removeOption = (id: string) => {
    if (draft.options.length <= 2) return;
    setDraft(current => ({ ...current, options: current.options.filter(option => option.id !== id) }));
    setResult(null);
  };

  const runAnalysis = async () => {
    setLoading(true); setError(''); setNotice('');
    try {
      const cleaned: DecisionInput = {
        ...draft,
        deadline: draft.deadline || null,
        options: draft.options.map(o => ({ ...o, name: o.name.trim(), description: o.description.trim(), prerequisites: o.prerequisites.filter(Boolean), unknowns: o.unknowns.filter(Boolean) })),
        important_unknowns: draft.important_unknowns.filter(Boolean),
      };
      const response = await analyzeDecision(cleaned);
      setResult(response); setActiveTab('overview');
      document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Check that the backend is running and try again.');
    } finally { setLoading(false); }
  };

  const exportResult = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify({ input: draft, result }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'antevorta-decision-report.json'; anchor.click(); URL.revokeObjectURL(url);
  };

  const updateNumeric = (key: 'horizon_months' | 'weekly_maintenance_hours' | 'existing_commitments_hours' | 'savings_npr' | 'monthly_surplus_npr', value: string) => {
    setDraft(current => ({ ...current, [key]: key === 'horizon_months' ? (value.trim() === '' ? 12 : Number(value)) : numericValue(value) }));
  };

  const assessmentById = useMemo(() => new Map(result?.constraints.option_assessments.map(a => [a.option_id, a]) || []), [result]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Antevorta home">
          <span className="brand-icon"><Compass size={20} strokeWidth={1.8} /></span>
          <span className="brand-word">antevorta<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <div className={`connection-chip ${metaStatus?.configured ? 'online' : 'offline'}`}>
            <span className="connection-dot" />{metaStatus?.configured ? 'Meta API configured' : 'Local fallback ready'}
          </div>
          <a className="docs-link" href="https://dev.meta.ai/docs/overview" target="_blank" rel="noreferrer">Meta API <ArrowDownRight size={14} /></a>
        </div>
      </header>

      <main id="top" className="main-layout">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-mark"><Sparkles size={13} /></span> DECISION INTELLIGENCE / 001</div>
          <h1>Test your plans<br /><span>against reality.</span></h1>
          <p className="hero-copy">Bring the decision you're wrestling with. Antevorta makes constraints visible, finds the assumptions that matter, and helps you test a path before you commit.</p>
          <div className="hero-meta">
            <span><ShieldCheck size={15} /> Evidence-aware</span><span><Activity size={15} /> Deterministic checks</span><span><GitBranch size={15} /> Conditional scenarios</span>
          </div>
          <div className="sample-disclosure"><span className="sample-marker">SAMPLE</span> The form starts with synthetic example values to make the first run easy. Replace them with your own non-sensitive test case before relying on the report.</div>
        </section>

        <div className="content-grid">
          <section className="builder-column">
            <div className="section-topline"><span className="section-index">01</span><div><h2>Set up your decision</h2><p>The quality of the analysis depends on the quality of the inputs.</p></div><button className="text-button" onClick={loadExample}><RefreshCw size={14} /> Load example</button></div>

            <div className="form-card">
              <div className="form-section-title"><span className="tiny-step">A</span><div><h3>The question</h3><p>What are you trying to decide?</p></div></div>
              <Field label="Decision question" hint="Be specific enough to compare real alternatives.">
                <textarea value={draft.question} onChange={e => setDraft(d => ({ ...d, question: e.target.value }))} rows={3} maxLength={1200} placeholder="What decision are you facing?" />
              </Field>
              <div className="field-row three-col">
                <Field label="Decision deadline"><input type="date" value={draft.deadline || ''} onChange={e => setDraft(d => ({ ...d, deadline: e.target.value || null }))} /></Field>
                <Field label="Compare over (months)"><input type="number" min={1} max={120} value={draft.horizon_months} onChange={e => updateNumeric('horizon_months', e.target.value)} /></Field>
                <Field label="Weekly maintenance (h)" hint="Sleep, commute, meals, life."><input type="number" min={0} max={168} step={0.5} value={draft.weekly_maintenance_hours ?? ''} onChange={e => updateNumeric('weekly_maintenance_hours', e.target.value)} placeholder="Unknown" /></Field>
              </div>
              <div className="form-section-title later"><span className="tiny-step">B</span><div><h3>Your current constraints</h3><p>Inputs that should stay consistent across options.</p></div></div>
              <div className="field-row three-col">
                <Field label="Existing commitments (h/week)"><input type="number" min={0} max={168} step={0.5} value={draft.existing_commitments_hours ?? ''} onChange={e => updateNumeric('existing_commitments_hours', e.target.value)} placeholder="Unknown" /></Field>
                <Field label="Available savings (NPR)"><input type="number" min={0} value={draft.savings_npr ?? ''} onChange={e => updateNumeric('savings_npr', e.target.value)} placeholder="Unknown" /></Field>
                <Field label="Monthly surplus / deficit (NPR)" hint="Negative values are allowed."><input type="number" value={draft.monthly_surplus_npr ?? ''} onChange={e => updateNumeric('monthly_surplus_npr', e.target.value)} placeholder="Unknown" /></Field>
              </div>
            </div>

            <div className="options-section-header"><div className="section-topline compact"><span className="section-index">02</span><div><h2>Define the paths</h2><p>Compare two or three real options.</p></div></div><span className="counter">{draft.options.length} / 3 OPTIONS</span></div>
            <div className="option-editor-grid">
              {draft.options.map((option, index) => (
                <article className={`option-editor option-editor-${index}`} key={option.id}>
                  <div className="option-editor-top"><div className="option-letter">{String.fromCharCode(65 + index)}</div><span className="option-kicker">PATH {String(index + 1).padStart(2, '0')}</span>{draft.options.length > 2 && <button className="icon-button" onClick={() => removeOption(option.id)} aria-label={`Remove ${option.name}`}><Trash2 size={14} /></button>}</div>
                  <Field label="Option name"><input value={option.name} onChange={e => updateOption(option.id, 'name', e.target.value)} maxLength={100} placeholder="Give this path a name" /></Field>
                  <Field label="What does this path involve?"><textarea value={option.description} onChange={e => updateOption(option.id, 'description', e.target.value)} rows={3} maxLength={1500} placeholder="Describe the plan and intended outcome." /></Field>
                  <div className="field-row two-col">
                    <Field label="Hours per week"><input type="number" min={0} max={168} step={0.5} value={option.required_hours_per_week ?? ''} onChange={e => updateOption(option.id, 'required_hours_per_week', numericValue(e.target.value))} placeholder="Unknown" /></Field>
                    <Field label="Upfront cost (NPR)"><input type="number" min={0} value={option.upfront_cost_npr ?? ''} onChange={e => updateOption(option.id, 'upfront_cost_npr', numericValue(e.target.value))} placeholder="Unknown" /></Field>
                  </div>
                  <Field label="Ongoing monthly cost (NPR)"><input type="number" min={0} value={option.monthly_cost_npr ?? ''} onChange={e => updateOption(option.id, 'monthly_cost_npr', numericValue(e.target.value))} placeholder="Unknown" /></Field>
                  <Field label="Prerequisites to verify" hint="One per line."><textarea value={option.prerequisites.join('\n')} onChange={e => updateOption(option.id, 'prerequisites', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} rows={2} placeholder="What must happen first?" /></Field>
                  <Field label="Option-specific unknowns" hint="One per line."><textarea value={option.unknowns.join('\n')} onChange={e => updateOption(option.id, 'unknowns', e.target.value.split('\n').map(x => x.trim()).filter(Boolean))} rows={2} placeholder="What information is still missing?" /></Field>
                </article>
              ))}
              {draft.options.length < 3 && <button className="add-option" onClick={addOption} type="button"><span><Plus size={18} /></span><strong>Add another path</strong><small>Explore a third alternative without committing to it.</small></button>}
            </div>

            <div className="form-card followup-card">
              <div className="form-section-title"><span className="tiny-step">C</span><div><h3>What would change your mind?</h3><p>Name the uncertainties worth investigating.</p></div></div>
              <Field label="Important unknowns" hint="One per line. Blank is fine; unknowns are not failures."><textarea value={draft.important_unknowns.join('\n')} onChange={e => setDraft(d => ({ ...d, important_unknowns: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) }))} rows={3} placeholder="What do you need to find out before deciding?" /></Field>
              <Field label="What matters most in this decision?" hint="One criterion per line. The agent can use these to structure trade-offs."><textarea value={draft.criteria.join('\n')} onChange={e => setDraft(d => ({ ...d, criteria: e.target.value.split('\n').map(x => x.trim()).filter(Boolean) }))} rows={2} placeholder="e.g. time feasibility, research progress, financial stability" /></Field>
              <Field label="One reversible experiment"><textarea value={draft.reversible_experiment} onChange={e => setDraft(d => ({ ...d, reversible_experiment: e.target.value }))} rows={3} maxLength={1200} placeholder="What low-cost action could reduce the biggest uncertainty?" /></Field>
              <button className="analyze-button" type="button" onClick={runAnalysis} disabled={loading || draft.options.some(o => !o.id.trim() || !o.name.trim())}>
                {loading ? <><LoaderCircle className="spin" size={17} /> Stress-testing your plan…</> : <><WandSparkles size={17} /> Run decision stress test <ArrowRight size={16} /></>}
              </button>
              <div className="privacy-note"><ShieldCheck size={14} /><span>Stateless in this version. Your decision is sent to the backend for analysis and is not intentionally stored. Do not enter information you don't want sent to the configured model provider.</span></div>
              {error && <div className="error-box" role="alert"><CircleAlert size={17} /><span>{error}</span></div>}
              {notice && <div className="notice-box" role="status"><Check size={16} />{notice}</div>}
            </div>
          </section>

          <aside className="side-column">
            <section className="side-card capacity-card">
              <div className="side-card-heading"><span className="side-icon"><Clock3 size={16} /></span><span>CAPACITY SNAPSHOT</span></div>
              <div className="capacity-number">{draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null ? hours(168 - draft.weekly_maintenance_hours - draft.existing_commitments_hours) : '—'}</div>
              <p className="capacity-label">weekly discretionary hours</p>
              <div className={`capacity-bar ${draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null ? '' : 'unknown'}`}><span style={{ width: `${draft.weekly_maintenance_hours !== null && draft.existing_commitments_hours !== null ? Math.max(0, Math.min(100, (draft.weekly_maintenance_hours + draft.existing_commitments_hours) / 168 * 100)) : 0}%` }} /></div>
              <div className="capacity-legend"><span><i className="dot-fixed" /> Maintenance + commitments</span><span><i className="dot-free" /> Available</span></div>
              {(draft.weekly_maintenance_hours === null || draft.existing_commitments_hours === null) && <p className="capacity-unknown">Enter both time inputs to calculate this bar.</p>}
              <p className="micro-note">This snapshot updates from your inputs. It is not a productivity or wellbeing score.</p>
            </section>

            <section className="side-card principles-card">
              <div className="side-card-heading"><span className="side-icon"><ShieldCheck size={16} /></span><span>TRUST BY DESIGN</span></div>
              <ul className="principles-list">
                <li><Check size={15} /><span><strong>Math, not model guesswork</strong><small>Hours and money are calculated in deterministic code.</small></span></li>
                <li><Check size={15} /><span><strong>Unknown stays unknown</strong><small>Missing inputs never quietly become zero.</small></span></li>
                <li><Check size={15} /><span><strong>Scenarios, not prophecies</strong><small>No invented percentages for a future life path.</small></span></li>
                <li><Check size={15} /><span><strong>You stay in control</strong><small>Antevorta exposes trade-offs; you make the decision.</small></span></li>
              </ul>
            </section>

            <section className="side-card meta-card">
              <div className="side-card-heading"><span className="side-icon"><Sparkles size={16} /></span><span>MODEL STATUS</span></div>
              <div className="model-row"><span className={`model-pulse ${metaStatus?.configured ? 'active' : ''}`} /><div><strong>{metaStatus?.configured ? (metaStatus.model_id || 'Meta Model API') : 'Deterministic fallback'}</strong><small>{metaStatus?.configured ? 'Server-side key detected' : 'Configure a key to enable the agent'}</small></div></div>
              <p className="micro-note">Model availability is checked by the backend configuration. A successful model call is confirmed in the analysis trace, not inferred from this badge.</p>
              {!metaStatus?.configured && <a className="setup-link" href="https://dev.meta.ai/docs/quickstart" target="_blank" rel="noreferrer"><KeyRound size={14} /> Set up Meta Model API <ArrowRight size={13} /></a>}
            </section>

            <div className="quote-card"><span className="quote-mark">“</span><p>The point isn't to predict your future. It's to help you see what your choices actually require.</p><span className="quote-caption">THE ANTEVORTA PRINCIPLE</span></div>
          </aside>
        </div>

        <section id="analysis-results" className="results-section">
          <div className="results-title-row"><div><div className="eyebrow"><span className="eyebrow-mark"><Workflow size={13} /></span> DECISION REPORT</div><h2>Where does the plan hold?</h2><p>The report separates deterministic checks from model-generated reasoning.</p></div>{result && <button className="export-button" onClick={exportResult}><Download size={15} /> Export report</button>}</div>
          {!result ? <div className="empty-results"><div className="empty-orbit"><GitBranch size={28} strokeWidth={1.5} /></div><h3>Your decision analysis will appear here.</h3><p>Run the stress test to see feasibility checks, conditional scenarios, unknowns, and a trace of any Meta model tool calls.</p><div className="empty-steps"><span><i>01</i> Enter the real constraints</span><span><i>02</i> Run deterministic checks</span><span><i>03</i> Inspect scenarios and evidence</span></div></div> : (
            <>
              <div className="report-status-row"><div className="report-mode"><span className={`mode-icon ${result.analysis_mode}`}><Sparkles size={17} /></span><div><strong>{result.analysis_mode === 'meta_agent' ? 'Meta-assisted analysis' : 'Deterministic fallback analysis'}</strong><small>{result.model_id ? `Model: ${result.model_id}` : 'No validated Meta tool-assisted response was completed.'}</small></div></div><div className={`verifier-chip ${result.verifier_status}`}><ShieldCheck size={14} /> Verifier: {result.verifier_status}</div></div>
              <div className="report-intro"><span className="label-upper">DECISION UNDER REVIEW</span><h3>{result.question}</h3><p>{result.narrative.summary}</p></div>
              <div className="results-tabs" role="tablist" aria-label="Analysis sections">
                <button role="tab" aria-selected={activeTab === 'overview'} className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Feasibility</button>
                <button role="tab" aria-selected={activeTab === 'scenarios'} className={activeTab === 'scenarios' ? 'active' : ''} onClick={() => setActiveTab('scenarios')}>Scenarios</button>
                <button role="tab" aria-selected={activeTab === 'trace'} className={activeTab === 'trace' ? 'active' : ''} onClick={() => setActiveTab('trace')}>Agent trace <span>{result.tool_trace.length}</span></button>
              </div>
              {activeTab === 'overview' && <div className="report-grid">
                {result.constraints.option_assessments.map((assessment, index) => <AssessmentCard key={assessment.option_id} assessment={assessment} narrative={result.narrative.option_analyses.find(n => n.option_id === assessment.option_id)} index={index} />)}
                <div className="report-panel full-width"><div className="panel-title"><Wallet size={16} /><h3>Shared constraint ledger</h3></div><div className="metric-grid"><Metric label="Weekly discretionary capacity" value={hours(result.constraints.weekly_capacity_hours)} /><Metric label="Available funds over horizon" value={money(result.constraints.option_assessments[0]?.projected_available_budget_npr)} /><Metric label="Horizon" value={`${result.constraints.time_horizon_months} months`} /><Metric label="Overall constraint status" value={statusText(result.constraints.overall_status)} /></div><p className="calculation-note">{result.constraints.arithmetic_policy}</p></div>
                <div className="report-panel"><div className="panel-title"><CircleAlert size={16} /><h3>Unknowns to resolve</h3></div>{result.constraints.important_unknowns.length ? <ul className="clean-list">{result.constraints.important_unknowns.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p className="muted-copy">No additional unknowns were entered. Consider what could change the decision.</p>}{result.constraints.missing_inputs.length > 0 && <div className="missing-box"><strong>Missing inputs</strong>{result.constraints.missing_inputs.map(x => <span key={x}>{x.replaceAll('_', ' ')}</span>)}</div>}</div>
                <div className="report-panel"><div className="panel-title"><FlaskConical size={16} /><h3>Next reversible experiment</h3></div><p>{result.narrative.reversible_experiment}</p><div className="divider-line" /><h4>Questions before deciding</h4><ul className="clean-list">{result.narrative.questions_before_deciding.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
              </div>}
              {activeTab === 'scenarios' && <div className="scenario-stack"><div className="conditional-banner"><GitBranch size={17} /><div><strong>Conditional paths, not predictions.</strong><p>Each scenario describes what to investigate under stated conditions. It does not claim to know the outcome.</p></div></div>{result.narrative.option_analyses.map((narrative, index) => { const assessment = assessmentById.get(narrative.option_id); return <article className="scenario-panel" key={narrative.option_id}><div className="scenario-head"><span className="option-letter">{String.fromCharCode(65 + index)}</span><div><span className="label-upper">PATH {String(index + 1).padStart(2, '0')}</span><h3>{assessment?.option_name || narrative.option_id}</h3></div>{assessment && <StatusPill status={assessment.overall_status} />}</div><div className="scenario-columns"><div><h4>Potential upside</h4><p>{narrative.potential_upside}</p></div><div><h4>Main trade-off</h4><p>{narrative.main_tradeoff}</p></div></div><div className="scenario-columns lower"><div><h4>Conditions to make it work</h4><ul className="clean-list">{narrative.conditions_to_make_it_work.map((c, i) => <li key={i}>{c}</li>)}</ul></div><div><h4>Questions to resolve</h4><ul className="clean-list">{narrative.questions_to_resolve.map((q, i) => <li key={i}>{q}</li>)}</ul></div></div></article>})}<div className="scenario-footnote">{result.narrative.caveat}</div></div>}
              {activeTab === 'trace' && <div className="trace-panel"><div className="trace-intro"><h3>What actually ran</h3><p>This trace distinguishes model calls, executed tools, deterministic calculations, and fallback behaviour. A configured key alone does not count as a successful model run.</p></div><div className="trace-list">{result.tool_trace.map((item, i) => <div className="trace-item" key={`${item.tool}-${i}`}><div className={`trace-status ${item.status}`}>{item.status === 'completed' ? <Check size={15} /> : item.status === 'blocked' ? <ShieldCheck size={15} /> : <CircleAlert size={15} />}</div><div><strong>{item.tool.replaceAll('_', ' ')}</strong><p>{item.detail}</p></div><span className={`trace-label ${item.status}`}>{item.status}</span></div>)}</div><div className="provider-note"><strong>Provider status</strong><p>{result.provider_status}</p><small>Generated {new Date(result.generated_at).toLocaleString()}</small></div></div>}
              <div className="report-disclaimer"><ShieldCheck size={15} /><span>{result.narrative.caveat} Antevorta supports your reasoning; it does not make the decision for you.</span></div>
            </>
          )}
        </section>
        <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-icon"><Compass size={18} /></span><span className="brand-word">antevorta<span className="brand-period">.</span></span></a><span>TEST YOUR DECISIONS BEFORE YOU LIVE THEM.</span><span className="footer-build">META GLOBAL AI DEVELOPER HACKATHON · BUILD 01</span></footer>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function AssessmentCard({ assessment, narrative, index }: { assessment: OptionAssessment; narrative?: AnalysisResponse['narrative']['option_analyses'][number]; index: number }) {
  return <article className="assessment-card"><div className="assessment-top"><span className="option-letter">{String.fromCharCode(65 + index)}</span><span className="label-upper">OPTION {index + 1}</span><StatusPill status={assessment.overall_status} /></div><h3>{assessment.option_name}</h3><div className="assessment-metrics"><div><span>Time headroom</span><strong className={assessment.time_status === 'CONFLICT' ? 'negative' : ''}>{hours(assessment.weekly_headroom_hours)}</strong><small>{assessment.time_status.toLowerCase()}</small></div><div><span>Budget headroom</span><strong className={assessment.money_status === 'CONFLICT' ? 'negative' : ''}>{money(assessment.projected_budget_headroom_npr)}</strong><small>{assessment.money_status.toLowerCase()}</small></div></div><p className="assessment-explanation">{assessment.explanation}</p>{narrative && <div className="assessment-upside"><span className="mini-label">THE TRADE-OFF</span><p>{narrative.main_tradeoff}</p></div>}{assessment.prerequisites_to_verify.length > 0 && <div className="prereq-tags">{assessment.prerequisites_to_verify.slice(0, 3).map((item, i) => <span key={i}>{item}</span>)}</div>}{assessment.missing_fields.length > 0 && <div className="missing-inline"><CircleAlert size={13} /> {assessment.missing_fields.length} missing value(s)</div>}</article>;
}
