import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Logo } from "@/components/ui";
export default function Pricing() {
  return (
    <div className="pricing-page">
      <header className="simple-nav">
        <Logo />
        <Link href="/dashboard" className="button secondary small">
          My workspace <ArrowRight size={15} />
        </Link>
      </header>
      <main id="main">
        <p className="eyebrow">CLARITY WITH NO COMMITMENT</p>
        <h1>
          Start free.
          <br />
          Build a better bill habit.
        </h1>
        <p className="pricing-description">
          Simple pricing is the plan. Today, the guest experience is free.
          <br />
          Plus is a proposed plan; subscriptions are not on sale.
        </p>
        <div className="pricing-cards">
          <section className="panel pricing-card">
            <span className="eyebrow">FREE</span>
            <h2>Your first clearer bill.</h2>
            <strong className="plan-price">$0</strong>
            <p>
              Planned free tier: one bill analysis and one script. The hackathon
              guest experience allows additional bills to demonstrate history
              and outcomes, with safety quotas.
            </p>
            <ul>
              <li>
                <Check /> PDF extraction and editable review
              </li>
              <li>
                <Check /> Charge-based recommendations
              </li>
              <li>
                <Check /> Personalized negotiation script
              </li>
              <li>
                <Check /> Private 7-day guest workspace
              </li>
            </ul>
            <Link href="/demo" className="button primary">
              Try BillShield free <ArrowRight size={16} />
            </Link>
          </section>
          <section className="panel pricing-card plus-plan">
            <span className="badge violet">PROPOSED · NOT YET AVAILABLE</span>
            <h2>BillShield Plus</h2>
            <strong className="plan-price">
              $7.99<span>/month</span>
            </strong>
            <p>
              A pricing hypothesis for people who want a monthly bill review
              habit. Features and price may change.
            </p>
            <ul>
              <li>
                <Check /> Planned: up to 10 analyses monthly
              </li>
              <li>
                <Check /> Planned: long-term bill history
              </li>
              <li>
                <Check /> Planned: reminders and exports
              </li>
              <li>
                <Check /> Planned: ongoing savings tracking
              </li>
            </ul>
            <div className="coming-soon">
              Paid subscriptions are not available yet.
            </div>
          </section>
        </div>
        <p className="tiny">
          No payment details requested. Potential savings depend on your
          provider and are never guaranteed.
        </p>
      </main>
    </div>
  );
}
