import Link from 'next/link';
import { ArrowDown, ArrowRight, Check, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/brand';
import { FlowVisual } from '@/components/flow-visual';
import { Button } from '@/components/ui/button';
export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#trust">The trust model</a>
          <Link href="/mission">
            Workspace <ArrowRight size={14} />
          </Link>
        </div>
        <span className="nav-status">
          <span className="live-dot" /> PAYPAL SANDBOX ONLY
        </span>
      </nav>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="short-rule" /> INTELLIGENCE, WITH BOUNDARIES
            </div>
            <p className="hero-brand">
              Bound<span>Pay</span>
              <span className="brand-period">.</span>
            </p>
            <h1>
              AI procurement that can spend — <span>but only inside your rules.</span>
            </h1>
            <p className="hero-description">
              Turn purchasing requests into policy-checked,
              <br className="desktop-break" /> explainable PayPal transactions.
            </p>
            <div className="hero-actions">
              <Button asChild>
                <Link href="/mission">
                  Create purchasing mission <ArrowRight size={17} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/mission?demo=1">
                  Run demo <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <p className="hero-assurance">
              <LockKeyhole size={13} /> Every purchase needs your approval. Always.
            </p>
          </div>
          <FlowVisual />
        </div>
        <div className="hero-footer">
          <span>BUILT FOR THE 2026 PAYPAL AI HACKATHON</span>
          <a href="#how-it-works">
            Explore the control plane <ArrowDown size={14} />
          </a>
          <span>01 / INTELLIGENCE → AUTHORITY</span>
        </div>
      </section>
      <section className="trust-strip" id="trust">
        <p>
          The AI decides <strong>what to recommend.</strong>
        </p>
        <p>
          Policy decides <strong>what’s allowed.</strong>
        </p>
        <p>
          You decide <strong>when money moves.</strong>
        </p>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="section-intro">
          <span className="eyebrow">A PURCHASE YOU CAN EXPLAIN</span>
          <h2>
            From intent to transaction.
            <br />
            <span>With nothing left unchecked.</span>
          </h2>
          <p>A focused workspace for the person who owns the budget.</p>
        </div>
        <div className="process-list">
          <article>
            <span className="process-number">01</span>
            <div>
              <h3>Define the mandate</h3>
              <p>
                Describe the mission. Review the extracted budget, quantity and requirements before
                research starts.
              </p>
            </div>
            <ArrowRight />
          </article>
          <article>
            <span className="process-number">02</span>
            <div>
              <h3>Inspect the recommendation</h3>
              <p>
                The bounded agent researches. Transparent ranking and an AG Grid comparison make
                every tradeoff visible.
              </p>
            </div>
            <ArrowRight />
          </article>
          <article>
            <span className="process-number">03</span>
            <div>
              <h3>Verify. Approve. Pay.</h3>
              <p>
                Deterministic rules check the basket. Your approval binds to its fingerprint. PayPal
                Sandbox executes.
              </p>
            </div>
            <ShieldCheck />
          </article>
        </div>
      </section>
      <section className="boundary-section">
        <div>
          <span className="eyebrow">FINANCIAL AUTHORITY IS CODE</span>
          <h2>
            Good recommendations
            <br />
            don’t bend the rules.
          </h2>
          <p>
            Over budget? Missing evidence? Changed basket?
            <br />
            The transaction stops before PayPal.
          </p>
          <Button asChild variant="secondary">
            <Link href="/mission?demo=1">
              See the guard in action <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="boundary-proof">
          <div>
            <Fingerprint size={22} />
            <span>ONE PURCHASE. ONE APPROVAL.</span>
          </div>
          <p>Mandate + basket + amount + currency</p>
          <code>SHA-256 purchase fingerprint</code>
          <div className="proof-check">
            <Check size={16} /> Any change requires a new review.
          </div>
        </div>
      </section>
      <footer className="landing-bottom">
        <Brand small />
        <span>Intelligence proposes. Authority stays with you.</span>
        <Link href="/mission">
          Open workspace <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
