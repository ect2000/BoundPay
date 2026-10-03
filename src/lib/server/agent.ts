import 'server-only';
import {
  audit,
  type AgentStep,
  type ResearchResult,
  type SpendingMandate,
  type ProductCandidate,
} from '../domain';
import { authorizeToolCall, evaluatePolicy, optimizeBasket, rankProducts } from '../policy';
import { config } from './config';
import { AppError } from './http';
import { fingerprint } from './state';
import { llmProvider, type LLMProvider } from './llm';
import { productProvider, type ProductProvider } from './products';
export type AgentState = {
  mission: string;
  mandate: SpendingMandate;
  researchPlan: string[];
  candidates: ProductCandidate[];
  remainingQuestions: string[];
  agentSteps: AgentStep[];
  proposedBasket: ResearchResult['basket'];
  policyResults: ResearchResult['policy'];
  approvalStatus: 'REQUIRED';
  paymentStatus: 'NOT_CREATED';
};
type StreamEvent = { type: 'step'; step: AgentStep } | { type: 'candidates'; count: number };
export async function research(
  mandate: SpendingMandate,
  onEvent: (event: StreamEvent) => void = () => {},
  deps?: { llm: LLMProvider; products: ProductProvider },
): Promise<Omit<ResearchResult, 'token'>> {
  const start = Date.now();
  const cfg = config();
  const llm = deps?.llm ?? llmProvider();
  const products = deps?.products ?? productProvider();
  const state: AgentState = {
    mission: mandate.title,
    mandate,
    researchPlan: [],
    candidates: [],
    remainingQuestions: [],
    agentSteps: [],
    proposedBasket: null,
    policyResults: null,
    approvalStatus: 'REQUIRED',
    paymentStatus: 'NOT_CREATED',
  };
  const events = [
    audit('USER', 'MANDATE_CONFIRMED', 'User confirmed the structured spending mandate.'),
    audit('AGENT', 'RESEARCH_STARTED', `Bounded research using ${products.name}.`),
  ];
  const add = (action: string, summary: string, since = Date.now()) => {
    if (state.agentSteps.length >= cfg.MAX_AGENT_STEPS)
      throw new AppError('Agent step limit reached. Narrow the mission and retry.', 422);
    const step: AgentStep = {
      id: crypto.randomUUID(),
      step: state.agentSteps.length + 1,
      action,
      summary,
      durationMs: Date.now() - since,
      timestamp: new Date().toISOString(),
    };
    state.agentSteps.push(step);
    onEvent({ type: 'step', step });
  };
  let toolCalls = 0;
  for (
    let searches = 0;
    searches < cfg.MAX_PRODUCT_SEARCHES && state.agentSteps.length < cfg.MAX_AGENT_STEPS - 3;
    searches++
  ) {
    const since = Date.now();
    const current = rankProducts(state.candidates, mandate);
    const plan = await llm.planNextAction({
      mandate,
      searchCount: searches,
      candidateCount: state.candidates.length,
      eligibleCount: current.filter((p) => p.eligible).length,
      queries: state.researchPlan,
    });
    add('PLAN', plan.reason, since);
    if (plan.action === 'finish') break;
    if (!authorizeToolCall(plan.action, { mandate }))
      throw new AppError('Agent tool call was denied.', 403);
    const query = plan.query.trim() || mandate.category;
    if (state.researchPlan.includes(query)) {
      add('COVERAGE', 'Duplicate search suppressed. Existing candidates retained.');
      break;
    }
    state.researchPlan.push(query);
    const searchStart = Date.now();
    toolCalls++;
    const found = await products.searchProducts(query, mandate);
    const map = new Map(state.candidates.map((p) => [p.id, p]));
    for (const p of found) {
      if (map.size < cfg.MAX_PRODUCT_RESULTS || map.has(p.id)) map.set(p.id, p);
    }
    state.candidates = [...map.values()];
    add(
      'SEARCH',
      `${query}: ${found.length} results; ${state.candidates.length} unique candidates.`,
      searchStart,
    );
    events.push(
      audit('AGENT', 'PRODUCT_SEARCHED', `Searched ${products.name}: ${query}`),
      audit('AGENT', 'PRODUCTS_FOUND', `${found.length} results normalized; duplicates removed.`),
    );
    onEvent({ type: 'candidates', count: state.candidates.length });
  }
  const ranked = rankProducts(state.candidates, mandate);
  add(
    'FILTER_AND_RANK',
    `${ranked.filter((p) => p.eligible).length} eligible; ${ranked.filter((p) => p.status === 'needs_evidence').length} need evidence; ${ranked.filter((p) => p.status === 'rejected').length} rejected by hard rules.`,
  );
  events.push(
    audit(
      'POLICY_ENGINE',
      'CANDIDATES_FILTERED',
      'Hard eligibility evaluated before deterministic weighted ranking.',
    ),
  );
  state.proposedBasket = optimizeBasket(ranked, mandate);
  state.policyResults = state.proposedBasket ? evaluatePolicy(mandate, state.proposedBasket) : null;
  const fp = state.proposedBasket ? fingerprint(mandate, state.proposedBasket) : null;
  add(
    'POLICY_GUARD',
    state.proposedBasket
      ? 'Basket constructed and checked. Human approval still required.'
      : 'No products satisfied every hard requirement. No payment mandate issued.',
  );
  let explanation =
    'No products satisfied every hard requirement. Inspect missing evidence or edit and reconfirm the mandate.';
  if (state.proposedBasket) {
    const since = Date.now();
    try {
      explanation = await llm.explainRecommendation(
        mandate,
        state.proposedBasket,
        ranked.slice(0, 6).map((p) => p.product),
      );
    } catch {
      explanation =
        'The highest-ranked eligible basket satisfies every confirmed hard rule. The AI explanation is unavailable; review the deterministic scoring and evidence before approving.';
    }
    add('EXPLAIN', 'Recommendation explanation prepared; no financial authority delegated.', since);
    events.push(
      audit(
        'AGENT',
        'BASKET_PROPOSED',
        'Highest-ranked eligible single-product basket selected.',
        fp ?? undefined,
      ),
      audit(
        'POLICY_ENGINE',
        'POLICY_VALIDATED',
        'Financial and product rules recomputed from normalized evidence.',
        fp ?? undefined,
      ),
    );
  }
  return {
    mandate,
    candidates: ranked,
    basket: state.proposedBasket,
    policy: state.policyResults,
    fingerprint: fp,
    explanation,
    steps: state.agentSteps,
    audit: events,
    metrics: {
      durationMs: Date.now() - start,
      llmCalls: llm.calls,
      toolCalls: products.calls ?? toolCalls,
      evaluated: ranked.length,
      rejected: ranked.filter((p) => p.status === 'rejected').length,
      needsEvidence: ranked.filter((p) => p.status === 'needs_evidence').length,
      eligible: ranked.filter((p) => p.eligible).length,
      constraintsChecked:
        state.policyResults?.evaluations.length ??
        ranked.reduce(
          (sum, p) =>
            sum +
            evaluatePolicy(mandate, { items: [{ product: p.product, quantity: mandate.quantity }] })
              .evaluations.length,
          0,
        ),
    },
    provider: products.name,
  };
}
