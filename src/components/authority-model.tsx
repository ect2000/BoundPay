'use client';
import { ArrowRight, Check, X } from 'lucide-react';
export function AuthorityModel() {
  return (
    <section className="authority-model" aria-label="Who can authorize a purchase">
      <div className="authority-roles">
        <div>
          <strong>AI</strong>
          <span>
            Recommend <Check size={12} />
          </span>
          <span>
            Spend <X size={12} />
          </span>
        </div>
        <div>
          <strong>Policy Guard</strong>
          <span>
            Validate <Check size={12} />
          </span>
          <span>
            Approve <X size={12} />
          </span>
        </div>
        <div>
          <strong>Human</strong>
          <span>
            Approve <Check size={12} />
          </span>
        </div>
        <div>
          <strong>PayPal</strong>
          <span>
            Execute <Check size={12} />
          </span>
        </div>
      </div>
      <p>
        AI recommendation <ArrowRight size={12} /> Policy Guard <ArrowRight size={12} /> Human
        Approval <ArrowRight size={12} /> PayPal Sandbox
      </p>
    </section>
  );
}
