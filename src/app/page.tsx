"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Monogram,
  SparkIcon,
  InboxIcon,
  UsersIcon,
  CalendarIcon,
  SendIcon,
  CheckIcon,
  AlertIcon,
  BookIcon,
  PulseIcon,
} from "@/components/icons";

const DEMO_EMAIL = "cyril.joseph@coco-samui-ai.com";

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp">
      {/* NAV */}
      <nav className={`lp-nav${scrolled ? " scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <Link href="/" className="brand">
            <Monogram size={26} /> <span className="wordmark">Coco</span>
          </Link>
          <div className="lp-nav-links">
            <a href="#product">Product</a>
            <a href="#usecases">Use cases</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-cta">
            <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <a href={`mailto:${DEMO_EMAIL}?subject=Coco%20demo`} className="btn btn-primary btn-sm">
              Book a demo
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="lp-container lp-hero">
        <span className="lp-eyebrow"><span className="dot" /> AI front desk · WhatsApp &amp; email</span>
        <h1>The front desk that <em>never</em> misses a customer.</h1>
        <p className="lead">
          Coco answers every message, qualifies the lead, and takes the booking —
          24/7, in your customer&apos;s language. It hands the moment to you the
          instant something needs a human.
        </p>
        <div className="lp-hero-cta">
          <a href={`mailto:${DEMO_EMAIL}?subject=Coco%20demo`} className="btn btn-primary btn-lg">
            Book a demo
          </a>
          <Link href="/login" className="btn btn-lg">See the console</Link>
        </div>
        <div className="lp-trustline">
          <span><span className="dot" /> Runs on Claude</span>
          <span><span className="dot" /> Answers in every language</span>
          <span><span className="dot" /> Escalates to you when it matters</span>
        </div>

        {/* PRODUCT PREVIEW */}
        <div className="lp-preview" id="product">
          <div className="browser">
            <div className="browser-bar">
              <span className="browser-dot" /><span className="browser-dot" /><span className="browser-dot" />
              <span className="browser-url">app.coco-samui-ai.com</span>
            </div>
            <div className="browser-body">
              <aside className="bp-side">
                <div className="brand"><Monogram size={22} /> <span className="wordmark" style={{ fontSize: 17 }}>Coco</span></div>
                <div className="bp-nav">
                  <span className="bp-nav-item on"><SparkIcon size={15} /> Assistant</span>
                  <span className="bp-nav-item"><InboxIcon size={15} /> Inbox</span>
                  <span className="bp-nav-item"><UsersIcon size={15} /> Leads</span>
                  <span className="bp-nav-item"><CalendarIcon size={15} /> Bookings</span>
                </div>
              </aside>
              <div className="bp-main">
                <div className="bp-hero-line">Good morning, Cyril.</div>
                <div className="bp-msg user">Any bookings I still need to confirm?</div>
                <div className="bp-msg ai">
                  <span className="who">Coco</span>
                  Two: a 2-person Koh Tao trip for Saturday (requested 1h ago) and a
                  PADI course for the 12th. Want me to draft confirmations?
                </div>
                <div className="bp-composer">
                  Ask about your business…
                  <span className="send"><SendIcon size={13} /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* USE CASES */}
      <section className="lp-section alt" id="usecases">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">What it does</span>
            <h2>One front desk, always on.</h2>
            <p>Coco covers the work that eats your day and loses you customers when you&apos;re on a boat, in a treatment, or asleep.</p>
          </div>
          <div className="lp-grid">
            <UseCase icon={<InboxIcon size={19} />} title="Answer every message">
              Replies to WhatsApp and email in seconds, grounded in your prices,
              services, and FAQ — no template robot, real answers.
            </UseCase>
            <UseCase icon={<UsersIcon size={19} />} title="Capture &amp; qualify leads">
              Every enquiry becomes a contact and a lead with its intent, so nothing
              slips through and follow-up is automatic.
            </UseCase>
            <UseCase icon={<CalendarIcon size={19} />} title="Take booking requests">
              Collects the date, party size, and pickup, then drops a clean booking
              in your queue for one-tap confirmation.
            </UseCase>
            <UseCase icon={<AlertIcon size={19} />} title="Escalate to a human">
              Complaints and urgent messages are never auto-answered — Coco pings you
              and holds the customer with a calm holding reply.
            </UseCase>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="lp-section" id="how">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">How it works</span>
            <h2>Live in an afternoon.</h2>
          </div>
          <div className="lp-steps">
            <Step n="1" title="Connect your channels">
              Point your WhatsApp number and email at Coco. No app for your customers
              to install — they message you exactly as they do today.
            </Step>
            <Step n="2" title="Teach it your business">
              Add your services, prices, tone, and FAQ in Knowledge. That&apos;s the
              only thing Coco ever answers from — you stay in control of the truth.
            </Step>
            <Step n="3" title="It answers, books &amp; flags">
              Coco handles the routine, fills your CRM, and escalates the rest. You
              open the console to a clear picture of what needs you.
            </Step>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="lp-section alt">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Why owners trust it</span>
            <h2>Automated, but never on autopilot.</h2>
          </div>
          <div className="lp-trust">
            <Trust icon={<CheckIcon size={18} />} title="Grounded in your data">
              Answers come only from your business profile — no invented prices, no
              guesses.
            </Trust>
            <Trust icon={<AlertIcon size={18} />} title="Human handoff built in">
              Complaints, urgent messages, and anything Coco is unsure about go
              straight to you.
            </Trust>
            <Trust icon={<PulseIcon size={18} />} title="Every action is logged">
              The Activity view shows what the AI did and where it stepped aside —
              full transparency.
            </Trust>
            <Trust icon={<BookIcon size={18} />} title="You own the voice">
              Set the tone and languages once; Coco sounds like your business, not a
              chatbot.
            </Trust>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="lp-section" id="pricing">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-kicker">Pricing</span>
            <h2>Simple, founder-friendly.</h2>
            <p>One plan, everything included. Launch pricing for the first Samui businesses on board.</p>
          </div>
          <div className="lp-pricing">
            <div className="price-card">
              <span className="tag">Founding offer</span>
              <div className="price-name">Coco Front Desk</div>
              <div className="price-amount">
                <span className="n">฿4,900</span>
                <span className="per">/ month</span>
              </div>
              <div className="price-list">
                <li className="li"><CheckIcon size={15} /> WhatsApp + email AI front desk</li>
                <li className="li"><CheckIcon size={15} /> Leads, bookings &amp; conversation CRM</li>
                <li className="li"><CheckIcon size={15} /> Human escalation &amp; daily summary</li>
                <li className="li"><CheckIcon size={15} /> Knowledge editor &amp; multilingual replies</li>
                <li className="li"><CheckIcon size={15} /> Owner console with ⌘K search</li>
              </div>
              <a href={`mailto:${DEMO_EMAIL}?subject=Coco%20—%20get%20started`} className="btn btn-primary btn-lg">
                Book a demo
              </a>
              <p className="faint" style={{ fontSize: 12, textAlign: "center" }}>
                No setup fee · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <Link href="/" className="brand"><Monogram size={22} /> <span className="wordmark" style={{ fontSize: 18 }}>Coco</span></Link>
          <div className="muted-links">
            <a href={`mailto:${DEMO_EMAIL}`}>{DEMO_EMAIL}</a>
            <Link href="/login">Sign in</Link>
          </div>
          <span className="faint" style={{ fontSize: 12.5 }}>© {new Date().getFullYear()} Coco</span>
        </div>
      </footer>
    </div>
  );
}

function UseCase({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="lp-card">
      <span className="ic">{icon}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="lp-step">
      <span className="n">{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Trust({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="ic">{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}
