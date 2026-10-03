'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  Download,
  FileText,
  Fingerprint,
  History,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  LockKeyhole,
  Monitor,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
  ExternalLink,
  CircleHelp,
  RefreshCw,
} from 'lucide-react';
import type {
  AgentStep,
  AuditEvent,
  Basket,
  HumanApproval,
  IntegrationStatus,
  PayPalOrder,
  PolicyResult,
  RankedProduct,
  ResearchResult,
  SpendingMandate,
} from '@/lib/domain';
import { audit } from '@/lib/domain';
import { DEMO_REQUEST, demoMandate } from '@/lib/demo';
import { money } from '@/lib/money';
import { Brand } from './brand';
import { Button } from './ui/button';
import { Drawer } from './ui/drawer';
import { MandateEditor } from './mandate-editor';
import { PolicyPanel } from './policy-panel';
import { EvidenceReview, type EvidenceInput } from './evidence-review';
const ProductGrid = dynamic(() => import('./product-grid'), {
  ssr: false,
  loading: () => (
    <div className="grid-loading">
      <LoaderCircle className="spin" />
      Loading comparison grid…
    </div>
  ),
});
const ScoreChart = dynamic(() => import('./score-chart'), { ssr: false });
type Proposal = {
  basket: Basket;
  policy: PolicyResult;
  fingerprint: string;
  explanation: string;
  token: string | null;
  paymentMandate: { expiresAt: string } | null;
  audit: AuditEvent;
};
type Phase = 'mission' | 'mandate' | 'research' | 'workspace';
type Tab = 'compare' | 'policy' | 'audit' | 'trace';
type Recent = { title: string; description: string; date: string };
async function post<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Request could not complete.');
  return result as T;
}
function download(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Workspace() {
  const params = useSearchParams();
  const demo = params.get('demo') === '1';
  const [phase, setPhase] = useState<Phase>('mission');
  const [tab, setTab] = useState<Tab>('compare');
  const [text, setText] = useState(demo ? DEMO_REQUEST : '');
  const [mandate, setMandate] = useState<SpendingMandate | null>(null);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [selected, setSelected] = useState<RankedProduct | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [candidateCount, setCandidateCount] = useState(0);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [approval, setApproval] = useState<HumanApproval | null>(null);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [order, setOrder] = useState<PayPalOrder | null>(null);
  const [drawer, setDrawer] = useState<'why' | 'payment' | 'evidence' | 'status' | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [filter, setFilter] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [returning, setReturning] = useState<'return' | 'cancel' | null>(null);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [parseMode, setParseMode] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const refreshStatus = useCallback(
    () =>
      fetch('/api/status')
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => setError('Integration status could not be loaded.')),
    [],
  );
  useEffect(() => {
    refreshStatus();
    queueMicrotask(() => {
      try {
        setRecent(JSON.parse(localStorage.getItem('bp_recent') ?? '[]'));
        const checkout = params.get('checkout');
        if (checkout === 'return' || checkout === 'cancel') {
          const saved = JSON.parse(sessionStorage.getItem('bp_checkout_ui') ?? 'null');
          if (saved) {
            setMandate(saved.mandate);
            setResult(saved.result);
            setProposal(saved.proposal);
            setSelected(saved.selected);
            setEvents(saved.events);
            setApproval(saved.approval);
            setOrder(saved.order);
            setCheckoutToken(saved.checkoutToken);
            setPhase('workspace');
            setTab('audit');
            setReturning(checkout);
          }
        }
      } catch {
        /* browser storage may be disabled */
      }
    });
    return () => abortRef.current?.abort();
  }, [params, refreshStatus]);
  const addEvents = (...e: AuditEvent[]) => setEvents((current) => [...current, ...e]);
  const clearAuthority = () => {
    setApproval(null);
    setApprovalToken(null);
    setOrder(null);
    setReviewed(false);
    setReturning(null);
    setCheckoutToken(null);
  };
  const choose = async (candidate: RankedProduct, researchResult = result) => {
    if (!researchResult) return;
    setBusy(true);
    setError('');
    clearAuthority();
    setSelected(candidate);
    try {
      const next = await post<Proposal>('/api/proposal', {
        token: researchResult.token,
        productId: candidate.product.id,
      });
      setProposal(next);
      addEvents(next.audit);
      if (approval)
        addEvents(
          audit(
            'USER',
            'APPROVAL_INVALIDATED',
            'Basket selection changed. A new review is required.',
          ),
        );
    } catch (e) {
      setError((e as Error).message);
      setProposal(null);
    } finally {
      setBusy(false);
    }
  };
  const parse = async () => {
    setBusy(true);
    setError('');
    try {
      const parsed = await post<{
        mandate: SpendingMandate;
        questions: string[];
        mode: string;
        model: string;
      }>('/api/parse', { text });
      setMandate(parsed.mandate);
      setQuestions(parsed.questions);
      setParseMode(parsed.mode);
      setEvents([
        audit(
          'AGENT',
          'MISSION_PARSED',
          `${parsed.mode === 'mock' ? 'Local deterministic parser' : 'OpenRouter'} extracted a draft. User review required.`,
        ),
      ]);
      clearAuthority();
      setPhase('mandate');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const manual = () => {
    const draft = demoMandate();
    setMandate({
      ...draft,
      title: 'New purchasing mission',
      description: text || 'Manually entered procurement mandate',
      category: '',
      quantity: 1,
      maxTotal: 10000,
      deliveryDeadline: null,
      hardConstraints: [],
      softPreferences: [],
    });
    setParseMode('manual');
    setQuestions([]);
    setPhase('mandate');
  };
  const startResearch = async (confirmed: SpendingMandate) => {
    setMandate(confirmed);
    setPhase('research');
    setBusy(true);
    setError('');
    setSteps([]);
    setCandidateCount(0);
    setResult(null);
    setProposal(null);
    setSelected(null);
    clearAuthority();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandate: confirmed, confirmed: true }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Research stream unavailable.');
      const decoder = new TextDecoder();
      let buffer = '';
      let final: ResearchResult | null = null;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline;
        while ((newline = buffer.indexOf('\n')) >= 0) {
          const event = JSON.parse(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          if (event.type === 'step') setSteps((prev) => [...prev, event.step]);
          if (event.type === 'candidates') setCandidateCount(event.count);
          if (event.type === 'error') throw new Error(event.error);
          if (event.type === 'result') final = event.result;
        }
      }
      if (!final) throw new Error('Research ended before a result was received.');
      setResult(final);
      addEvents(...final.audit);
      setPhase('workspace');
      setTab('compare');
      const nextRecent = [
        {
          title: confirmed.title,
          description: confirmed.description,
          date: new Date().toISOString(),
        },
        ...recent.filter((r) => r.title !== confirmed.title),
      ].slice(0, 5);
      setRecent(nextRecent);
      try {
        localStorage.setItem('bp_recent', JSON.stringify(nextRecent));
      } catch {}
      const recommendation = final.candidates.find((p) => p.eligible);
      if (recommendation) await choose(recommendation, final);
      else if (final.candidates[0]) await choose(final.candidates[0], final);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setError('Research cancelled. No payment authority was issued.');
      } else setError((e as Error).message);
      setPhase('mandate');
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };
  const approve = async () => {
    if (!proposal?.token || !reviewed) return;
    setBusy(true);
    setError('');
    try {
      const response = await post<{ approval: HumanApproval; token: string; audit: AuditEvent }>(
        '/api/approve',
        { token: proposal.token, reviewed: true },
      );
      setApproval(response.approval);
      setApprovalToken(response.token);
      addEvents(response.audit);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const createOrder = async () => {
    if (!approvalToken) return;
    setBusy(true);
    setError('');
    try {
      const response = await post<{ order: PayPalOrder; audit: AuditEvent; checkoutToken: string }>(
        '/api/paypal/order',
        { token: approvalToken },
      );
      setOrder(response.order);
      setCheckoutToken(response.checkoutToken);
      addEvents(response.audit);
      try {
        sessionStorage.setItem(
          'bp_checkout_ui',
          JSON.stringify({
            mandate,
            result,
            proposal,
            selected,
            events: [...events, response.audit],
            approval,
            order: response.order,
            checkoutToken: response.checkoutToken,
          }),
        );
      } catch {
        if (response.order.mode === 'sandbox')
          throw new Error(
            'Browser session storage is required to safely resume the PayPal checkout.',
          );
      }
      if (response.order.approvalUrl) window.location.assign(response.order.approvalUrl);
      else {
        setDrawer(null);
        setTab('audit');
      }
    } catch (e) {
      setError((e as Error).message);
      addEvents(audit('PAYPAL', 'PAYMENT_FAILED', (e as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const capture = async () => {
    if (!order || !checkoutToken) return;
    setBusy(true);
    setError('');
    try {
      const response = await post<{ order: PayPalOrder; audit: AuditEvent }>(
        '/api/paypal/capture',
        { orderId: order.id, checkoutToken, cancel: returning === 'cancel' },
      );
      setOrder(response.order);
      addEvents(response.audit);
      setReturning(null);
      sessionStorage.removeItem('bp_checkout_ui');
      window.history.replaceState({}, '', '/mission');
    } catch (e) {
      setError((e as Error).message);
      addEvents(audit('PAYPAL', 'PAYMENT_FAILED', (e as Error).message));
    } finally {
      setBusy(false);
    }
  };
  const saveEvidence = async (input: EvidenceInput) => {
    if (!result || !selected) return;
    setBusy(true);
    setError('');
    try {
      const response = await post<{
        token: string;
        candidates: RankedProduct[];
        audit: AuditEvent;
      }>('/api/evidence', { ...input, token: result.token, productId: selected.product.id });
      const updated = { ...result, token: response.token, candidates: response.candidates };
      setResult(updated);
      addEvents(response.audit);
      setDrawer(null);
      const candidate = response.candidates.find((p) => p.product.id === selected.product.id);
      if (candidate) await choose(candidate, updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const rows = (result?.candidates ?? []).filter(
    (p) =>
      (!eligibleOnly || p.eligible) &&
      `${p.product.title} ${p.product.merchant}`.toLowerCase().includes(filter.toLowerCase()),
  );
  const newMission = async () => {
    if (busy) return;
    abortRef.current?.abort();
    setBusy(true);
    setPhase('mission');
    setMandate(null);
    setResult(null);
    setProposal(null);
    setSelected(null);
    setEvents([]);
    setText('');
    setError('');
    clearAuthority();
    try {
      await post('/api/invalidate', {});
    } catch {
      setError('Session invalidation failed. Reload before continuing.');
    } finally {
      setBusy(false);
    }
  };
  const editMandate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await post('/api/invalidate', {});
      clearAuthority();
      setPhase(mandate ? 'mandate' : 'mission');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const rejectPurchase = async () => {
    setBusy(true);
    try {
      await post('/api/invalidate', {});
      clearAuthority();
      addEvents(
        audit(
          'USER',
          'APPROVAL_INVALIDATED',
          'User rejected the purchase; checkout context cleared.',
        ),
      );
      setDrawer(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const stageIndex =
    phase === 'mission'
      ? 0
      : phase === 'mandate'
        ? 1
        : phase === 'research'
          ? 2
          : order
            ? 5
            : approval
              ? 4
              : 3;
  return (
    <div className="app-shell">
      <a href="#workspace-main" className="skip-link">
        Skip to workspace
      </a>
      <header className="app-header">
        <Brand small />
        <div className="header-breadcrumb">
          <span>Procurement workspace</span>
          <ChevronRight size={13} />
          <strong>{mandate?.title ?? 'New mission'}</strong>
        </div>
        <button className="environment-badge" onClick={() => setDrawer('status')}>
          <span className="live-dot" />
          {status?.local ? 'LOCAL DEVELOPMENT' : 'SANDBOX ENVIRONMENT'}
          <SlidersHorizontal size={13} />
        </button>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-section">WORKSPACE</div>
          <button
            className={phase === 'mission' || phase === 'mandate' ? 'active' : ''}
            onClick={editMandate}
          >
            <FileText size={16} />
            Purchasing mission
          </button>
          <button
            disabled={!result}
            className={phase === 'workspace' && tab === 'compare' ? 'active' : ''}
            onClick={() => {
              setPhase('workspace');
              setTab('compare');
            }}
          >
            <LayoutGrid size={16} />
            Product comparison
          </button>
          <button
            disabled={!proposal}
            className={phase === 'workspace' && tab === 'policy' ? 'active' : ''}
            onClick={() => {
              setPhase('workspace');
              setTab('policy');
            }}
          >
            <ShieldCheck size={16} />
            Policy Guard
            {proposal && <span className={`sidebar-dot ${proposal.policy.valid ? '' : 'red'}`} />}
          </button>
          <button
            disabled={!result}
            className={phase === 'workspace' && tab === 'audit' ? 'active' : ''}
            onClick={() => {
              setPhase('workspace');
              setTab('audit');
            }}
          >
            <History size={16} />
            Audit trail
          </button>
          <button
            disabled={!result}
            className={phase === 'workspace' && tab === 'trace' ? 'active' : ''}
            onClick={() => {
              setPhase('workspace');
              setTab('trace');
            }}
          >
            <Terminal size={16} />
            Agent trace
          </button>
          <div className="sidebar-section recent-title">RECENT MISSIONS</div>
          {recent.length ? (
            recent.map((r, i) => (
              <button
                className="recent-mission"
                key={`${r.title}-${i}`}
                onClick={() => {
                  newMission();
                  setText(r.description);
                }}
              >
                <span className="recent-dot" />
                <span>{r.title}</span>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">
              Your missions stay on
              <br />
              this device.
            </p>
          )}
          <Button
            variant="secondary"
            size="small"
            className="new-mission"
            onClick={newMission}
            disabled={busy}
          >
            <Plus size={14} />
            New mission
          </Button>
          <div className="sidebar-bottom">
            <LockKeyhole size={16} />
            <strong>Your rules. Enforced.</strong>
            <p>
              AI recommends.
              <br />
              You authorize.
            </p>
            <button onClick={() => setDrawer('status')}>
              Integration status <ArrowUpRight size={12} />
            </button>
          </div>
        </aside>
        <main className="workspace-main" id="workspace-main">
          <div className="stage-nav">
            {['Mission', 'Mandate', 'Research', 'Verify', 'Approve', 'Pay & audit'].map((s, i) => (
              <div className={i === stageIndex ? 'current' : i < stageIndex ? 'done' : ''} key={s}>
                <span>{i < stageIndex ? <Check size={11} /> : String(i + 1).padStart(2, '0')}</span>
                {s}
                {i < 5 && <ChevronRight size={13} />}
              </div>
            ))}
          </div>
          {status?.local && (
            <div className="dev-notice">
              <Terminal size={13} />
              <span>
                Local development:{' '}
                {status.llm.mode === 'mock' ? 'deterministic parser (no AI)' : 'OpenRouter AI'} ·{' '}
                {status.products.mode === 'mock'
                  ? 'synthetic product fixtures'
                  : 'Channel3 live data'}{' '}
                ·{' '}
                {status.paypal.mode === 'mock'
                  ? 'checkout simulation (no payment)'
                  : 'real PayPal Sandbox'}
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <X size={16} />
              <span>{error}</span>
              <button onClick={() => setError('')} aria-label="Dismiss error">
                <X size={15} />
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              className="phase-content"
              key={phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {phase === 'mission' && (
                <section className="mission-start">
                  <div className="workspace-eyebrow">
                    <span className="short-rule" /> NEW PURCHASING MISSION
                  </div>
                  <h1>What does your team need?</h1>
                  <p className="workspace-subtitle">
                    Give the agent a goal. Give your budget a boundary.
                  </p>
                  <div className="mission-composer">
                    <div className="composer-label">
                      <Bot size={17} />
                      <span>PURCHASING REQUEST</span>
                      <span className="key-label">PLAIN ENGLISH</span>
                    </div>
                    <label className="sr-only" htmlFor="mission-request">
                      Purchasing request
                    </label>
                    <textarea
                      id="mission-request"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      maxLength={4000}
                      placeholder="Describe what you need, how many, your budget, and what must be true…"
                    />
                    <div className="composer-bottom">
                      <span>
                        <LockKeyhole size={13} /> Approval always required
                      </span>
                      <Button disabled={busy || text.trim().length < 10} onClick={parse}>
                        {busy ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        Extract mandate <ArrowRight size={15} />
                      </Button>
                    </div>
                  </div>
                  <div className="example-request">
                    <div>
                      <span className="eyebrow">TRY A MISSION</span>
                      <button onClick={() => setText(DEMO_REQUEST)}>
                        Equip a 12-person engineering team <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <p>27-inch USB-C monitors · $3,000 ceiling · 4.5+ rating</p>
                  </div>
                  <button className="text-link" onClick={manual}>
                    Prefer to set the rules yourself? Enter a structured mandate{' '}
                    <ArrowRight size={14} />
                  </button>
                  <div className="mission-principles">
                    <div>
                      <span>01</span>
                      <strong>You define the boundaries</strong>
                      <p>Hard rules stay separate from preferences.</p>
                    </div>
                    <div>
                      <span>02</span>
                      <strong>The agent does the research</strong>
                      <p>Product evidence and tradeoffs stay visible.</p>
                    </div>
                    <div>
                      <span>03</span>
                      <strong>You hold the authority</strong>
                      <p>Nothing moves until you review and approve.</p>
                    </div>
                  </div>
                </section>
              )}
              {phase === 'mandate' && mandate && (
                <div className="mandate-container">
                  {parseMode && (
                    <div className="parse-attribution">
                      <span className="status-chip neutral">
                        {parseMode === 'mock'
                          ? 'LOCAL PARSER'
                          : parseMode === 'manual'
                            ? 'MANUAL ENTRY'
                            : 'OPENROUTER AI'}
                      </span>
                      <span>Draft only. Confirmation creates the spending mandate.</span>
                    </div>
                  )}
                  {questions.length > 0 && (
                    <div className="question-note">
                      <CircleHelp size={17} />
                      <div>
                        <strong>Resolve before confirming</strong>
                        {questions.map((q) => (
                          <p key={q}>{q}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <MandateEditor
                    key={mandate.missionId}
                    mandate={mandate}
                    onConfirm={startResearch}
                    onBack={() => setPhase('mission')}
                    busy={busy}
                  />
                </div>
              )}
              {phase === 'research' && (
                <section className="research-view">
                  <div className="workspace-eyebrow">
                    <Bot size={17} /> BOUNDED PROCUREMENT AGENT
                  </div>
                  <h1>Research, within your rules.</h1>
                  <p className="workspace-subtitle">
                    Actual tool events appear as they complete. Payment tools stay locked.
                  </p>
                  <div className="research-surface">
                    <div className="research-status">
                      <LoaderCircle size={24} className="spin" />
                      <div>
                        <strong>
                          {steps.at(-1)?.action === 'SEARCH'
                            ? 'Evaluating research coverage'
                            : 'Research is running'}
                        </strong>
                        <span>{candidateCount} unique candidates received</span>
                      </div>
                      <span className="status-chip amber-chip">NO SPENDING AUTHORITY</span>
                    </div>
                    <div className="trace-list">
                      {steps.map((step) => (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="trace-row"
                        >
                          <span>{String(step.step).padStart(2, '0')}</span>
                          <div>
                            <strong>{step.action.replaceAll('_', ' ')}</strong>
                            <p>{step.summary}</p>
                          </div>
                          <span>{step.durationMs} ms</span>
                          <Check size={14} />
                        </motion.div>
                      ))}
                    </div>
                    <div className="research-foot">
                      <span>
                        <LockKeyhole size={14} />
                        Human approval has not been granted.
                      </span>
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => abortRef.current?.abort()}
                      >
                        Cancel research
                      </Button>
                    </div>
                  </div>
                </section>
              )}
              {phase === 'workspace' && result && mandate && (
                <>
                  <div className="workspace-title-row">
                    <div>
                      <div className="workspace-eyebrow">
                        MISSION / {mandate.missionId.slice(0, 8).toUpperCase()}
                      </div>
                      <h1>{mandate.title}</h1>
                      <p>
                        {mandate.quantity} units <span>·</span>{' '}
                        {money(mandate.maxTotal, mandate.currency)} budget <span>·</span>{' '}
                        {mandate.deliveryDeadline
                          ? `Delivery by ${mandate.deliveryDeadline}`
                          : 'No delivery deadline'}
                      </p>
                    </div>
                    <Button variant="secondary" size="small" onClick={editMandate}>
                      Edit mandate <SlidersHorizontal size={14} />
                    </Button>
                  </div>
                  <div className="workspace-tabs">
                    {(
                      [
                        { id: 'compare', label: 'Compare products', icon: LayoutGrid },
                        { id: 'policy', label: 'Policy Guard', icon: ShieldCheck },
                        { id: 'audit', label: 'Audit trail', icon: History },
                        { id: 'trace', label: 'Agent trace', icon: Terminal },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        className={tab === t.id ? 'active' : ''}
                        onClick={() => setTab(t.id)}
                      >
                        <t.icon size={15} />
                        {t.label}
                        {t.id === 'compare' && <span>{result.candidates.length}</span>}
                      </button>
                    ))}
                  </div>
                  {tab === 'compare' && (
                    <div className="comparison-layout">
                      <div className="comparison-main">
                        <div className="research-summary">
                          <span>
                            <span className="live-dot" />
                            {result.provider === 'Local fixtures'
                              ? 'FIXTURE RESEARCH COMPLETE'
                              : 'RESEARCH COMPLETE'}
                          </span>
                          <div>
                            <strong>{result.metrics.evaluated}</strong> evaluated{' '}
                            <span className="summary-divider" />{' '}
                            <strong className="safe-text">
                              {result.candidates.filter((p) => p.eligible).length}
                            </strong>{' '}
                            eligible <span className="summary-divider" />{' '}
                            <strong className="danger-text">
                              {result.candidates.filter((p) => !p.eligible).length}
                            </strong>{' '}
                            rejected
                          </div>
                        </div>
                        {!result.candidates.some((p) => p.eligible) && (
                          <div className="no-eligible">
                            <ShieldCheck size={18} />
                            <div>
                              <strong>No products satisfied every hard requirement.</strong>
                              <p>
                                Inspect a candidate and review its missing evidence, or edit and
                                reconfirm your mandate.
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="grid-toolbar">
                          <div className="search-control">
                            <Search size={14} />
                            <input
                              aria-label="Filter products"
                              placeholder="Filter products or merchants…"
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            />
                          </div>
                          <button
                            className={eligibleOnly ? 'active' : ''}
                            onClick={() => setEligibleOnly((v) => !v)}
                          >
                            <ListFilter size={14} />
                            Eligible only
                          </button>
                          <button
                            className={compact ? 'active' : ''}
                            onClick={() => setCompact((v) => !v)}
                            aria-label="Toggle compact grid"
                          >
                            <SlidersHorizontal size={15} />
                          </button>
                        </div>
                        <div className="desktop-grid">
                          <ProductGrid
                            rows={rows}
                            mandate={mandate}
                            onSelect={(p) => {
                              if (!busy) void choose(p);
                            }}
                            filter={filter}
                            compact={compact}
                          />
                        </div>
                        <div className="mobile-products">
                          {rows.map((p) => (
                            <button
                              key={p.product.id}
                              onClick={() => choose(p)}
                              className={`mobile-product ${selected?.product.id === p.product.id ? 'selected' : ''}`}
                            >
                              <div>
                                <strong>{p.product.title}</strong>
                                <span>{p.product.merchant}</span>
                              </div>
                              <span>{money(p.product.unitPrice, mandate.currency)}</span>
                              <span className={`status-chip ${p.eligible ? 'safe' : 'danger'}`}>
                                {p.eligible ? '✓ Eligible' : '× Rejected'}
                              </span>
                              <small>
                                {p.product.rating ?? 'Unknown'} rating · {p.score}/100 score
                              </small>
                            </button>
                          ))}
                        </div>
                        <div className="grid-footer">
                          <span>
                            AG Grid Community <span>·</span> Sort, filter, pin columns & select a
                            row
                          </span>
                          <span>Integer-cent totals</span>
                        </div>
                        {selected && (
                          <section className="candidate-detail">
                            <div className="detail-icon">
                              <Monitor size={25} />
                            </div>
                            <div>
                              <span className="eyebrow">
                                {selected.eligible
                                  ? 'SELECTED CANDIDATE'
                                  : 'CANDIDATE UNDER REVIEW'}
                              </span>
                              <h3>{selected.product.title}</h3>
                              <p>
                                {selected.product.features.join(' · ') ||
                                  'Features require verification'}
                              </p>
                              <div className="candidate-source">
                                <span>
                                  {selected.product.source === 'fixture'
                                    ? 'SYNTHETIC FIXTURE'
                                    : 'LIVE CHANNEL3 LISTING'}
                                </span>
                                <a
                                  href={selected.product.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Source listing <ExternalLink size={12} />
                                </a>
                              </div>
                            </div>
                            <div className="detail-actions">
                              <Button variant="ghost" size="small" onClick={() => setDrawer('why')}>
                                Why this? <CircleHelp size={14} />
                              </Button>
                              {selected.product.source === 'channel3' && (
                                <Button
                                  variant="secondary"
                                  size="small"
                                  onClick={() => setDrawer('evidence')}
                                >
                                  Review quote evidence
                                </Button>
                              )}
                            </div>
                          </section>
                        )}
                        <div className="ranking-footnote">
                          <Fingerprint size={14} />
                          <span>
                            Eligibility first. Ranking second. A high score never overrides a hard
                            rule.
                          </span>
                        </div>
                      </div>
                      <aside className="policy-inspector">
                        {proposal ? (
                          <PolicyPanel
                            policy={proposal.policy}
                            mandate={mandate}
                            fingerprint={proposal.fingerprint}
                            approved={!!approval}
                            onApprove={() => setDrawer('payment')}
                            compact
                          />
                        ) : (
                          <div className="empty-inspector">
                            <ShieldCheck size={34} />
                            <h3>Policy Guard</h3>
                            <p>Select a product to inspect every financial and product rule.</p>
                            <span className="status-chip amber-chip">PAYMENT LOCKED</span>
                          </div>
                        )}
                      </aside>
                    </div>
                  )}
                  {tab === 'policy' &&
                    (proposal ? (
                      <div className="full-policy-layout">
                        <div>
                          <div className="policy-page-title">
                            <ShieldCheck size={36} />
                            <h2>
                              {proposal.policy.valid
                                ? 'Every hard rule passed.'
                                : 'This purchase is blocked.'}
                            </h2>
                            <p>
                              {proposal.policy.valid
                                ? 'Review the exact purchase. Your approval is the final authority.'
                                : 'No payment token was issued. Change the basket or reconfirm a revised mandate.'}
                            </p>
                          </div>
                          <section className="basket-summary">
                            <span className="eyebrow">PROPOSED BASKET</span>
                            <h3>{proposal.basket.items[0].product.title}</h3>
                            <div>
                              <span>
                                {mandate.quantity} ×{' '}
                                {money(
                                  proposal.basket.items[0].product.unitPrice,
                                  mandate.currency,
                                )}
                              </span>
                              <strong>{money(proposal.policy.total, mandate.currency)}</strong>
                            </div>
                            <p>{proposal.basket.items[0].product.merchant}</p>
                            <Button variant="secondary" onClick={() => setDrawer('why')}>
                              Inspect selection rationale <ArrowRight size={15} />
                            </Button>
                          </section>
                          <section className="fingerprint-proof">
                            <Fingerprint size={20} />
                            <h3>Approval integrity</h3>
                            <p>
                              This hash covers the mission, constraints, basket, amount, currency,
                              merchant and product evidence. Changing any purchase field requires
                              another approval.
                            </p>
                            <code>{proposal.fingerprint}</code>
                          </section>
                          <Button variant="ghost" onClick={() => setTab('compare')}>
                            <ArrowLeft size={15} />
                            Return to comparison
                          </Button>
                        </div>
                        <PolicyPanel
                          policy={proposal.policy}
                          mandate={mandate}
                          fingerprint={proposal.fingerprint}
                          approved={!!approval}
                          onApprove={() => setDrawer('payment')}
                        />
                      </div>
                    ) : (
                      <div className="empty-state">
                        <ShieldCheck size={36} />
                        <h2>No basket has been selected.</h2>
                        <p>Inspect candidate evidence in the comparison workspace.</p>
                        <Button onClick={() => setTab('compare')}>Compare candidates</Button>
                      </div>
                    ))}
                  {tab === 'trace' && (
                    <section className="trace-view">
                      <div className="section-heading">
                        <div>
                          <h2>Agent trace</h2>
                          <p>Actual planning and tool execution. No hidden spending decisions.</p>
                        </div>
                        <span className="status-chip neutral">{result.provider}</span>
                      </div>
                      <div className="trace-metrics">
                        {[
                          [
                            'Analysis duration',
                            `${(result.metrics.durationMs / 1000).toFixed(2)}s`,
                          ],
                          ['LLM requests', result.metrics.llmCalls],
                          [
                            result.provider === 'Channel3'
                              ? 'Channel3 API calls'
                              : 'Product searches',
                            result.metrics.toolCalls,
                          ],
                          ['Products evaluated', result.metrics.evaluated],
                          ['Rule evaluations', result.metrics.constraintsChecked],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <span>{label}</span>
                            <strong>{value}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="trace-list">
                        {result.steps.map((step) => (
                          <div key={step.id} className="trace-row">
                            <span>{String(step.step).padStart(2, '0')}</span>
                            <div>
                              <strong>{step.action.replaceAll('_', ' ')}</strong>
                              <p>{step.summary}</p>
                            </div>
                            <span>{step.durationMs} ms</span>
                            <Check size={15} />
                          </div>
                        ))}
                      </div>
                      <div className="trace-limit">
                        <LockKeyhole size={16} />
                        <p>
                          The agent can research, compare and build a proposal. It cannot create or
                          capture a payment without valid policy and explicit human approval.
                        </p>
                      </div>
                    </section>
                  )}
                  {tab === 'audit' && (
                    <section className="audit-view">
                      <div className="section-heading">
                        <div>
                          <h2>Audit trail</h2>
                          <p>Every major decision, attributed to the actor responsible.</p>
                        </div>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() =>
                            download(
                              {
                                mission: mandate,
                                candidates: result.candidates,
                                proposal: proposal
                                  ? {
                                      basket: proposal.basket,
                                      policy: proposal.policy,
                                      fingerprint: proposal.fingerprint,
                                    }
                                  : null,
                                approval,
                                order,
                                events,
                                metrics: result.metrics,
                              },
                              `boundpay-audit-${mandate.missionId.slice(0, 8)}.json`,
                            )
                          }
                        >
                          <Download size={14} />
                          Export JSON
                        </Button>
                      </div>
                      <div className="payment-lifecycle">
                        <div>
                          <span className="eyebrow">
                            PAYPAL / {order?.mode === 'mock' ? 'LOCAL SIMULATION' : 'SANDBOX'}
                          </span>
                          <h3>
                            {order?.status === 'COMPLETED'
                              ? 'Sandbox payment completed'
                              : order?.status === 'SIMULATED'
                                ? 'Local checkout simulated'
                                : order?.status === 'CANCELLED'
                                  ? 'Payment cancelled'
                                  : order
                                    ? 'Waiting for PayPal confirmation'
                                    : 'Order not created'}
                          </h3>
                          <p>
                            {order?.status === 'SIMULATED'
                              ? 'No PayPal API was called and no payment was made.'
                              : order?.captureId
                                ? `Capture ID: ${order.captureId}`
                                : order
                                  ? `Order ID: ${order.id}`
                                  : 'Human approval and Policy Guard must pass before order creation.'}
                          </p>
                        </div>
                        {returning && (
                          <Button disabled={busy} onClick={capture}>
                            {busy ? (
                              <LoaderCircle size={15} className="spin" />
                            ) : (
                              <ShieldCheck size={15} />
                            )}{' '}
                            {returning === 'cancel'
                              ? 'Record cancellation'
                              : 'Verify approval & capture'}
                          </Button>
                        )}
                        {order?.status === 'COMPLETED' && (
                          <span className="status-chip safe">
                            <Check size={14} />
                            CONFIRMED BY PAYPAL
                          </span>
                        )}
                      </div>
                      <div className="audit-timeline">
                        {events.map((event, i) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="audit-event"
                          >
                            <span className={`audit-node ${event.actor.toLowerCase()}`}>
                              {event.actor === 'PAYPAL' ? (
                                <Check size={13} />
                              ) : event.actor === 'POLICY_ENGINE' ? (
                                <ShieldCheck size={13} />
                              ) : event.actor === 'AGENT' ? (
                                <Bot size={13} />
                              ) : (
                                <FileText size={13} />
                              )}
                            </span>
                            <div>
                              <div className="audit-event-header">
                                <strong>{event.action.replaceAll('_', ' ')}</strong>
                                <span>{event.actor.replace('_', ' ')}</span>
                                <time>
                                  {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                                    hour12: false,
                                  })}
                                </time>
                              </div>
                              <p>{event.summary}</p>
                              {event.fingerprint && <code>{event.fingerprint.slice(0, 20)}…</code>}
                            </div>
                            <span className="audit-index">{String(i + 1).padStart(2, '0')}</span>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={12} />
              Policy enforcement is deterministic.
            </span>
            <span>
              BoundPay <span className="footer-slash">/</span> Intelligence with boundaries
            </span>
          </footer>
        </main>
      </div>
      <Drawer
        open={drawer === 'why'}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
        title="Why this candidate?"
        description="Transparent deterministic ranking. AI explanations supplement evidence; they do not authorize payment."
      >
        {selected && (
          <>
            <div className="drawer-product">
              <Monitor size={34} />
              <div>
                <h3>{selected.product.title}</h3>
                <p>{selected.product.merchant}</p>
              </div>
              <span className={`status-chip ${selected.eligible ? 'safe' : 'danger'}`}>
                {selected.eligible ? 'ELIGIBLE' : 'REJECTED'}
              </span>
            </div>
            <p className="recommendation-copy">
              {selected.product.id === result?.basket?.items[0].product.id
                ? result.explanation
                : (proposal?.explanation ??
                  'Inspect the hard-constraint failures and evidence before selecting this candidate.')}
            </p>
            <div className="score-heading">
              <strong>Value score</strong>
              <span>
                {selected.score}
                <small>/100</small>
              </span>
            </div>
            <ScoreChart candidate={selected} />
            <p className="formula">
              30% value + 25% quality + 20% delivery + 15% preferences + 10% merchant.
            </p>
            {selected.failures.length > 0 && (
              <div className="failure-list">
                <h3>Hard-rule failures</h3>
                {selected.failures.map((f) => (
                  <p key={f}>
                    <X size={13} />
                    {f}
                  </p>
                ))}
              </div>
            )}
            <div className="evidence-section">
              <h3>Product evidence</h3>
              <p>{selected.product.evidence.description}</p>
              <span>
                Observed: {new Date(selected.product.evidence.observedAt).toLocaleString('en-GB')}
              </span>
              {selected.product.evidence.notes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
            <h3 className="drawer-section-heading">Alternatives considered</h3>
            <div className="alternatives">
              {result?.candidates
                .filter((p) => p.product.id !== selected.product.id)
                .slice(0, 4)
                .map((p) => (
                  <div key={p.product.id}>
                    <div>
                      <strong>{p.product.title}</strong>
                      <span>{p.eligible ? 'Eligible' : p.failures[0]}</span>
                    </div>
                    <span>{p.score}/100</span>
                  </div>
                ))}
            </div>
          </>
        )}
      </Drawer>
      <Drawer
        open={drawer === 'payment'}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
        title="Payment mandate"
        description="Review this exact purchase. Approval is required before any PayPal Sandbox order is created."
      >
        {proposal && mandate && (
          <>
            <div className="payment-document">
              <div className="payment-document-head">
                <Brand small />
                <span>
                  {order?.mode === 'mock' || status?.paypal.mode === 'mock'
                    ? 'LOCAL SIMULATION'
                    : 'PAYPAL SANDBOX'}
                </span>
              </div>
              <span className="eyebrow">AUTHORIZED PURCHASE PROPOSAL</span>
              <h3>{mandate.title}</h3>
              <div className="payment-line">
                <span>
                  {mandate.quantity} × {proposal.basket.items[0].product.title}
                </span>
                <strong>{money(proposal.policy.total, mandate.currency)}</strong>
              </div>
              <p className="payment-merchant">
                Merchant: {proposal.basket.items[0].product.merchant}
              </p>
              <div className="payment-total">
                <span>Total purchase amount</span>
                <strong>{money(proposal.policy.total, mandate.currency)}</strong>
                <small>{mandate.currency} · final per-unit quote × quantity</small>
              </div>
              <dl className="payment-facts">
                <div>
                  <dt>Authorized budget</dt>
                  <dd>{money(mandate.maxTotal, mandate.currency)}</dd>
                </div>
                <div>
                  <dt>Remaining headroom</dt>
                  <dd className="safe-text">{money(proposal.policy.headroom, mandate.currency)}</dd>
                </div>
                <div>
                  <dt>Hard-rule checks</dt>
                  <dd>
                    {proposal.policy.evaluations.filter((e) => e.status === 'PASS').length} PASS ·{' '}
                    {proposal.policy.evaluations.filter((e) => e.status === 'FAIL').length} FAIL
                  </dd>
                </div>
                <div>
                  <dt>Approval</dt>
                  <dd className={approval ? 'safe-text' : 'amber'}>
                    {approval ? 'GRANTED FOR THIS HASH' : 'HUMAN REVIEW REQUIRED'}
                  </dd>
                </div>
              </dl>
              <div className="payment-fingerprint">
                <Fingerprint size={16} />
                <div>
                  <span>PURCHASE FINGERPRINT</span>
                  <code>{proposal.fingerprint}</code>
                </div>
              </div>
              <p className="payment-expiry">
                Proposal expires{' '}
                {proposal.paymentMandate
                  ? new Date(proposal.paymentMandate.expiresAt).toLocaleTimeString('en-GB')
                  : '—'}
                . Approval expires after 10 minutes.
              </p>
            </div>
            {status?.paypal.mode === 'sandbox' && (
              <p className="checkout-note">
                This Sandbox payment goes to the configured test merchant account. It does not order
                goods from the source retailer.
              </p>
            )}
            {approval ? (
              <div className="approval-confirmed">
                <div>
                  <Check size={20} />
                  <strong>Human approval recorded.</strong>
                </div>
                <p>Bound to this purchase. Any change requires a new review.</p>
                <Button className="full-width" disabled={busy} onClick={createOrder}>
                  {busy ? <LoaderCircle className="spin" size={16} /> : <LockKeyhole size={16} />}{' '}
                  {status?.paypal.mode === 'mock'
                    ? 'Continue to local checkout simulation'
                    : 'Continue to PayPal Sandbox'}{' '}
                  <ArrowRight size={16} />
                </Button>
              </div>
            ) : (
              <div className="human-approval">
                <label>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>
                    I reviewed this purchase, its evidence, merchant, total and policy checks.
                  </span>
                </label>
                <Button
                  className="full-width"
                  onClick={approve}
                  disabled={!reviewed || busy || !proposal.policy.valid}
                >
                  {busy ? <LoaderCircle className="spin" size={16} /> : <Fingerprint size={16} />}
                  Approve this purchase <ArrowRight size={16} />
                </Button>
              </div>
            )}
            <Button className="full-width" variant="ghost" disabled={busy} onClick={rejectPurchase}>
              Reject & return to comparison
            </Button>
          </>
        )}
      </Drawer>
      <Drawer
        open={drawer === 'evidence'}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
        title="Verify merchant evidence"
        description="Missing facts fail closed. You can supply a current quote after personally checking it."
      >
        {selected && (
          <EvidenceReview
            key={selected.product.id}
            product={selected.product}
            onSave={saveEvidence}
            busy={busy}
          />
        )}
      </Drawer>
      <Drawer
        open={drawer === 'status'}
        onOpenChange={(o) => {
          if (!o) setDrawer(null);
        }}
        title="Integration status"
        description="Configuration status only. Successful workflow calls and audit events provide connection evidence."
      >
        {status && (
          <div className="integration-list">
            <div>
              <Bot size={22} />
              <h3>OpenRouter</h3>
              <span className="status-chip neutral">{status.llm.status}</span>
              <dl>
                <dt>Primary</dt>
                <dd>{status.llm.model}</dd>
                <dt>Fallback</dt>
                <dd>{status.llm.fallback}</dd>
                <dt>Inference cost</dt>
                <dd>$0 · allowlist + catalog price checks</dd>
              </dl>
            </div>
            <div>
              <Search size={22} />
              <h3>Product provider</h3>
              <span className="status-chip neutral">{status.products.status}</span>
              <p>
                {status.products.mode === 'mock'
                  ? 'Synthetic local catalog. No live prices.'
                  : 'Channel3 search and product details.'}
              </p>
            </div>
            <div>
              <LockKeyhole size={22} />
              <h3>PayPal</h3>
              <span className="status-chip neutral">{status.paypal.status}</span>
              <p>
                {status.paypal.mode === 'mock'
                  ? 'Local simulation. No API calls or payment.'
                  : 'Orders v2 · Sandbox endpoint only.'}
              </p>
            </div>
            <div>
              <ShieldCheck size={22} />
              <h3>Policy Guard</h3>
              <span className="status-chip safe">READY</span>
              <p>Integer-cent arithmetic, signed state, human approval.</p>
            </div>
            <Button variant="secondary" onClick={refreshStatus}>
              <RefreshCw size={14} />
              Refresh status
            </Button>
            <Link href="/" className="text-link">
              Back to BoundPay <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
