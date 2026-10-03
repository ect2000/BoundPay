'use client';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Check,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
export function FlowVisual() {
  return (
    <div
      className="flow-visual"
      aria-label="AI proposes, Policy Guard verifies, human approves, PayPal executes"
    >
      <div className="visual-grid" />
      <div className="flow-caption">
        <span className="live-dot" /> THE AUTHORITY BOUNDARY
      </div>
      <motion.div
        className="visual-request"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="code-label">PURCHASING MISSION</span>
        <p>
          12 workspaces. $3,000 ceiling.
          <br />
          Your requirements. Your approval.
        </p>
      </motion.div>
      <div className="visual-link first">
        <span />
      </div>
      <motion.div
        className="agent-node"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Bot size={22} />
        <div>
          <strong>Procurement agent</strong>
          <span>Research · compare · recommend</span>
        </div>
        <span className="node-tag">AI</span>
      </motion.div>
      <div className="visual-link">
        <span />
      </div>
      <motion.div
        className="guard-node"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="guard-title">
          <ShieldCheck size={23} />
          <strong>Policy Guard</strong>
          <LockKeyhole size={15} />
        </div>
        <div className="guard-rule">
          <span>Budget ceiling</span>
          <span>
            <Check size={13} /> Enforced
          </span>
        </div>
        <div className="guard-rule">
          <span>Hard requirements</span>
          <span>
            <Check size={13} /> Enforced
          </span>
        </div>
        <div className="guard-rule">
          <span>Human approval</span>
          <span className="amber">
            <UserRound size={13} /> Required
          </span>
        </div>
        <div className="guard-bottom">
          <Fingerprint size={14} /> Every approval binds to one purchase.
        </div>
      </motion.div>
      <div className="visual-link short">
        <span />
      </div>
      <div className="execution-node">
        <span>
          <UserRound size={17} /> You approve
        </span>
        <ArrowRight size={16} />
        <span className="paypal-word">
          Pay<span>Pal</span>
        </span>
      </div>
      <div className="boundary-label">
        <LockKeyhole size={12} /> Intelligence stops here. Your rules take over.
      </div>
    </div>
  );
}
