import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Upload,
  LockKeyhole,
  ShieldCheck,
  Minus,
  Plus,
} from "lucide-react";
import { Logo } from "@/components/ui";
export default function Home() {
  return (
    <div className="marketing">
      <header className="marketing-nav">
        <Logo light />
        <nav>
          <a href="#how-it-works">How it works</a>
          <Link href="/pricing">Pricing</Link>
          <a href="#privacy">Your privacy</a>
        </nav>
        <Link className="button light-button small" href="/demo">
          Try BillShield free <ArrowUpRight size={16} />
        </Link>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-grid" />
          <div className="hero-copy">
            <p className="hero-pill">
              <span className="live-dot" /> A little clarity. A better monthly
              bill.
            </p>
            <h1>
              Your bills shouldn’t
              <br />
              be a <span>mystery.</span>
            </h1>
            <p className="hero-description">
              Understand your internet charges, find opportunities to save, and
              know exactly what to ask your provider.
            </p>
            <div className="hero-buttons">
              <Link className="button primary" href="/demo">
                Analyze my bill <ArrowRight size={18} />
              </Link>
              <a className="text-button" href="#how-it-works">
                See how it works <span>↗</span>
              </a>
            </div>
            <p className="hero-trust">
              <span>
                <Check size={15} /> No signup
              </span>
              <span>
                <Check size={15} /> No provider login
              </span>
              <span>
                <Check size={15} /> You stay in control
              </span>
            </p>
          </div>
          <div className="hero-visual">
            <div className="floating-label">
              <ShieldCheck size={18} /> A clearer picture of your bill
            </div>
            <div className="illustration-card">
              <div className="illustration-header">
                <span className="provider-mark">H</span>
                <div>
                  <strong>Home internet</strong>
                  <small>Illustrative statement · not a live result</small>
                </div>
                <span className="badge green">Reviewed</span>
              </div>
              <div className="illustration-total">
                <span>MONTHLY STATEMENT</span>
                <strong>
                  $99<span>.00</span>
                </strong>
              </div>
              <div className="bill-example">
                <div>
                  <span>Internet service</span>
                  <strong>$75.00</strong>
                </div>
                <div className="highlight">
                  <span>
                    <span className="charge-dot" /> Equipment rental
                  </span>
                  <strong>$15.00</strong>
                </div>
                <div>
                  <span>Security add-on</span>
                  <strong>$9.00</strong>
                </div>
              </div>
              <div className="illustration-insight">
                <div className="insight-icon">
                  <ArrowUpRight size={22} />
                </div>
                <div>
                  <strong>Two charges worth a conversation</strong>
                  <p>Check equipment options and add-on needs.</p>
                </div>
              </div>
              <div className="illustration-bottom">
                <span>Potential monthly savings</span>
                <strong>
                  $0–$24 <small>/mo</small>
                </strong>
              </div>
              <p className="illustration-disclaimer">
                Conditional on provider approval. Not guaranteed.
              </p>
            </div>
            <div className="visual-footnote">
              <LockKeyhole size={14} /> Your original PDF is processed, then
              discarded.
            </div>
          </div>
          <div className="hero-bottom">
            <span>YOUR BILL. YOUR CHOICES. YOUR NEXT MOVE.</span>
            <span>
              Built for U.S. home internet bills <ArrowDownIcon />
            </span>
          </div>
        </section>
        <section className="value-strip">
          <div>
            <FileText />
            <strong>Real bills, real clarity</strong>
            <p>See what every charge means.</p>
          </div>
          <div>
            <MessageSquareText />
            <strong>A conversation starter</strong>
            <p>Go in prepared with your bill facts.</p>
          </div>
          <div>
            <ShieldCheck />
            <strong>Progress you can prove</strong>
            <p>Track confirmed reductions over time.</p>
          </div>
        </section>
        <section id="how-it-works" className="marketing-section">
          <div className="section-top">
            <p className="eyebrow">FROM CONFUSION TO CONFIDENCE</p>
            <h2>
              Less guesswork.
              <br />A clear next step.
            </h2>
            <p>
              Skip the spreadsheet and the hours of research.
              <br />
              Make your next provider conversation count.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                n: "01",
                icon: Upload,
                title: "Bring your bill",
                text: "Upload a PDF of your internet bill. No access to your provider account required.",
              },
              {
                n: "02",
                icon: FileText,
                title: "Make it make sense",
                text: "Review the extracted charges. Correct anything, then see what is worth checking.",
              },
              {
                n: "03",
                icon: MessageSquareText,
                title: "Take the next step",
                text: "Use a personalized script, record the response, and track any confirmed savings.",
              },
            ].map((s) => (
              <div className="step" key={s.n}>
                <span className="step-number">{s.n}</span>
                <s.icon size={25} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="privacy-section" id="privacy">
          <div className="privacy-symbol">
            <ShieldCheck size={76} />
          </div>
          <div>
            <p className="eyebrow">TRUST STARTS WITH TRANSPARENCY</p>
            <h2>
              Your bill is personal.
              <br />
              We treat it that way.
            </h2>
            <p>
              Original PDFs are processed in memory and discarded. Reviewed
              charges stay in your isolated guest workspace for 7 days. Delete
              everything whenever you want.
            </p>
            <Link href="/settings" className="inline-link">
              See your privacy controls <ArrowRight size={16} />
            </Link>
          </div>
          <ul>
            <li>
              <CheckCircle2 /> No bank connection
            </li>
            <li>
              <CheckCircle2 /> No provider credentials
            </li>
            <li>
              <CheckCircle2 /> No guaranteed-savings claims
            </li>
            <li>
              <CheckCircle2 /> No automatic changes to your plan
            </li>
          </ul>
        </section>
        <section className="marketing-section pricing-preview">
          <div>
            <p className="eyebrow">START WITH ONE CLEARER BILL</p>
            <h2>
              Get clarity.
              <br />
              Keep the control.
            </h2>
            <p>
              Your first step is free. Our proposed Plus plan is $7.99/month.
              <br />
              Paid subscriptions are not available yet.
            </p>
            <Link href="/pricing" className="inline-link">
              See the plan details <ArrowRight size={16} />
            </Link>
          </div>
          <div className="free-card">
            <span className="badge violet">FREE GUEST EXPERIENCE</span>
            <strong>
              $0<span> to get started</span>
            </strong>
            <p>Analyze a bill. Prepare your next conversation.</p>
            <div>
              <Check size={17} /> Real PDF extraction & editable review
            </div>
            <div>
              <Check size={17} /> Evidence-based recommendations
            </div>
            <div>
              <Check size={17} /> Negotiation scripts & outcome tracking
            </div>
            <Link href="/demo" className="button primary">
              Try BillShield free <ArrowRight size={16} />
            </Link>
          </div>
        </section>
        <section className="marketing-section faq">
          <div>
            <p className="eyebrow">GOOD QUESTIONS</p>
            <h2>A little more clarity.</h2>
          </div>
          <div>
            {[
              [
                "Will BillShield lower my bill automatically?",
                "No. We help you understand your charges and prepare a conversation. You contact your provider and decide which changes to make. Any savings depend on your provider and your situation.",
              ],
              [
                "What kinds of bills work?",
                "U.S. residential internet bills in PDF format, up to 10 MB and 20 pages. OCR reads English text inside images on up to 5 pages, including mixed text-and-image PDFs. Review all recognized values; unreadable details can be entered manually.",
              ],
              [
                "Is this AI-powered?",
                "Core extraction, analysis, calculations and scripts work without AI. If a server operator enables optional AI extraction, document text may be sent to that provider. The interface identifies when AI assisted a particular bill.",
              ],
              [
                "What counts as confirmed savings?",
                "Only reductions you record as confirmed and effective are counted. Repeated actions on one service account are consolidated rather than added together. Annualized savings are a 12-month projection, not money already saved.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <Plus size={17} />
                  <Minus className="minus" size={17} />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-cta">
          <p className="eyebrow">YOUR NEXT BILL CAN MAKE MORE SENSE</p>
          <h2>Start with a clearer picture.</h2>
          <Link href="/demo" className="button primary">
            Analyze my bill <ArrowRight size={17} />
          </Link>
          <small>Free to try. No signup required.</small>
        </section>
      </main>
      <footer className="marketing-footer">
        <Logo />
        <span>
          © {new Date().getFullYear()} BillShield. Clarity before commitments.
        </span>
        <Link href="/settings">Privacy</Link>
        <Link href="/pricing">Pricing</Link>
      </footer>
    </div>
  );
}
function ArrowDownIcon() {
  return <span aria-hidden="true">↓</span>;
}
