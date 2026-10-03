'use client';
import { motion } from 'motion/react';
import {
  Check,
  X,
  LockKeyhole,
  ShieldCheck,
  ArrowRight,
  Fingerprint,
  CircleHelp,
} from 'lucide-react';
import type { PolicyResult, SpendingMandate } from '@/lib/domain';
import { money } from '@/lib/money';
import { Button } from './ui/button';
export function PolicyPanel({
  policy,
  mandate,
  fingerprint,
  approved,
  onApprove,
  compact = false,
  onReviewEvidence,
  onRestore,
}: {
  policy: PolicyResult;
  mandate: SpendingMandate;
  fingerprint: string;
  approved: boolean;
  onApprove: () => void;
  compact?: boolean;
  onReviewEvidence?: () => void;
  onRestore?: () => void;
}) {
  const missing = policy.evaluations.filter((r) => r.status === 'NEEDS_EVIDENCE');
  const failed = policy.evaluations.some((r) => r.status === 'FAIL');
  return (
    <section className={`policy-panel ${compact ? 'compact' : ''}`}>
      <div className="panel-heading">
        <ShieldCheck size={20} />
        <h3>Policy Guard</h3>
        <span
          className={`status-chip ${policy.valid ? 'safe' : !failed ? 'amber-chip' : 'danger'}`}
        >
          {policy.valid ? 'VERIFIED' : !failed ? 'NEEDS EVIDENCE' : 'BLOCKED'}
        </span>
      </div>
      {policy.headroom < 0 && (
        <div className="over-budget-moment">
          <span>AUTHORIZED BUDGET</span>
          <strong>{money(mandate.maxTotal, mandate.currency)}</strong>
          <span>PROPOSED</span>
          <strong>{money(policy.total, mandate.currency)}</strong>
          <b>PAYMENT BLOCKED</b>
          <p>+{money(-policy.headroom, mandate.currency)} over authorized mandate</p>
          <p>AI recommendations cannot override spending policy.</p>
          {onRestore && (
            <Button variant="secondary" onClick={onRestore}>
              Restore compliant recommendation
            </Button>
          )}
        </div>
      )}
      <div className="policy-budget">
        <span>Proposed spend</span>
        <strong>{money(policy.total, mandate.currency)}</strong>
        <small>of {money(mandate.maxTotal, mandate.currency)} authorized</small>
        <div className={`budget-track ${policy.valid ? '' : 'over'}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (policy.total / mandate.maxTotal) * 100)}%` }}
            transition={{ duration: 0.45 }}
          />
        </div>
        <div className="headroom">
          <span>{policy.headroom >= 0 ? 'Remaining headroom' : 'Over budget'}</span>
          <strong className={policy.headroom >= 0 ? 'safe-text' : 'danger-text'}>
            {money(Math.abs(policy.headroom), mandate.currency)}
          </strong>
        </div>
      </div>
      <div className="policy-rules">
        {policy.evaluations.map((rule, i) => (
          <motion.div
            className={`policy-rule ${rule.status === 'FAIL' ? 'failed' : rule.status === 'NEEDS_EVIDENCE' ? 'pending' : ''}`}
            key={`${rule.rule}-${i}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.025, duration: 0.15 }}
          >
            <div className="rule-icon">
              {rule.status === 'NEEDS_EVIDENCE' ? (
                <CircleHelp size={14} />
              ) : rule.status === 'FAIL' ? (
                <X size={14} />
              ) : rule.status === 'REQUIRES_APPROVAL' ? (
                approved ? (
                  <Check size={14} />
                ) : (
                  <LockKeyhole size={13} />
                )
              ) : (
                <Check size={14} />
              )}
            </div>
            <div>
              <strong>{rule.label}</strong>
              <span>
                {rule.status === 'REQUIRES_APPROVAL' && approved
                  ? 'Approved for this fingerprint'
                  : rule.observed}
              </span>
            </div>
            <span
              className={`rule-status ${rule.status === 'FAIL' ? 'danger-text' : (rule.status === 'REQUIRES_APPROVAL' && !approved) || rule.status === 'NEEDS_EVIDENCE' ? 'amber' : 'safe-text'}`}
            >
              {rule.status === 'NEEDS_EVIDENCE'
                ? 'VERIFY'
                : rule.status === 'FAIL'
                  ? 'FAIL'
                  : rule.status === 'REQUIRES_APPROVAL' && !approved
                    ? 'REQUIRED'
                    : 'PASS'}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="policy-verdict">
        <span className={policy.valid ? 'safe-text' : 'danger-text'}>
          {policy.valid
            ? 'PAYMENT SAFE TO PRESENT'
            : missing.length && !failed
              ? 'EVIDENCE INSUFFICIENT — PAYMENT BLOCKED'
              : 'PAYMENT BLOCKED'}
        </span>
        <p>
          {policy.valid
            ? 'Financial rules passed. Human review controls the next step.'
            : missing.length && !failed
              ? `Cannot verify: ${missing.map((r) => r.label).join(', ')}. Unknown is never treated as true.`
              : 'A hard rule failed. Checkout capability cannot be issued.'}
        </p>
      </div>
      {missing.length > 0 && onReviewEvidence && (
        <Button variant="secondary" className="full-width" onClick={onReviewEvidence}>
          Review missing evidence
        </Button>
      )}
      <div className="fingerprint-label">
        <Fingerprint size={14} />
        <code>
          {fingerprint.slice(0, 12)}…{fingerprint.slice(-6)}
        </code>
      </div>
      <Button className="full-width" onClick={onApprove} disabled={!policy.valid}>
        Review payment mandate <ArrowRight size={15} />
      </Button>
    </section>
  );
}
