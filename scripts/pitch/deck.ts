export const LIVE_URL = "https://billshield-tyxt.onrender.com";
const REPO = "https://github.com/Eqziz/billshield";
type DeckOptions = {
  assets: {
    dashboard: string;
    analysis: string;
    review: string;
    action: string;
    script: string;
  };
  qr: string;
  notes: string[];
  css: string;
  fontLicense: string;
};
const escape = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const shield =
  '<svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 2 29 7v10c0 8-6 13-13 17C9 30 3 25 3 17V7L16 2Z" stroke="currentColor" stroke-width="2.3"/><path d="m10 17 4 4 8-9" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function icon(kind: string) {
  const paths: Record<string, string> = {
    document:
      '<path d="M7 3h9l5 5v17H7V3Z"/><path d="M16 3v6h5M11 14h6m-6 5h6"/>',
    check: '<path d="m5 15 6 6L25 7"/>',
    chat: '<path d="M4 4h22v17H12l-8 6V4Z"/><path d="M9 10h12M9 15h8"/>',
    trend: '<path d="M4 7v19h23M8 11l6 6 6-3 7 8"/>',
    lock: '<rect x="6" y="13" width="19" height="15" rx="3"/><path d="M10 13V8a5.5 5.5 0 0 1 11 0v5M16 19v4"/>',
    arrow: '<path d="M4 16h23m-8-8 8 8-8 8"/>',
    upload: '<path d="M6 22v5h20v-5M16 22V4m-7 7 7-7 7 7"/>',
  };
  return `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.document}</svg>`;
}
function frame(src: string, label: string, extra = "") {
  return `<div class="product-frame ${extra}"><div class="browser-bar"><span></span><span></span><span></span><small>${label}</small></div><img src="${src}" alt="Actual BillShield product screen using a fictional sample bill"></div>`;
}
function pill(text: string, extra = "") {
  return `<span class="pill ${extra}">${text}</span>`;
}
function heading(kicker: string, title: string, sub = "") {
  return `<div class="slide-heading"><p class="kicker">${kicker}</p><h2>${title}</h2>${sub ? `<p class="subtitle">${sub}</p>` : ""}</div>`;
}

export function renderDeck({
  assets,
  qr,
  notes,
  css,
  fontLicense,
}: DeckOptions) {
  const slideBodies = [
    `<div class="cover-copy"><p class="kicker">A CLEARER BILL. A BETTER NEXT STEP.</p><h1>Your internet bill.<br><em>Finally, understood.</em></h1><p class="cover-sub">Understand your charges. Prepare the conversation.<br>Track what actually changes.</p><div class="cover-tags">${pill("U.S. home internet")}${pill("B2C · ages 25–45")}${pill("No signup")}</div><a class="cta" href="${LIVE_URL}/demo">Try the live product ${icon("arrow")}</a><a class="cover-url" href="${LIVE_URL}">billshield-tyxt.onrender.com</a></div><div class="cover-product">${frame(assets.dashboard, "BILLSHIELD / LIVE PRODUCT")}<div class="screen-caption"><span class="status-dot"></span>Actual product · fictional sample data</div></div>`,
    `${heading("01 / THE PROBLEM", "One total.<br>Too many unanswered questions.", "The charge is recurring. The confusion doesn’t have to be.")}<div class="problem-grid"><div class="statement"><div class="statement-top"><span>HOME INTERNET</span>${pill("Synthetic example", "mini")}</div><div class="statement-total"><span>Monthly statement</span><strong>$99<span>.00</span></strong></div><div class="charge"><span>Internet service</span><strong>$75.00</strong></div><div class="charge highlighted"><span>Equipment rental</span><strong>$15.00</strong></div><div class="charge highlighted"><span>Security add-on</span><strong>$9.00</strong></div><p class="small-note">Amounts match the included fictional PDF fixture.</p></div><div class="problem-insights"><div class="pain"><b>01</b><div><h3>What is this charge?</h3><p>Service, equipment and add-ons arrive in one total.</p></div></div><div class="pain"><b>02</b><div><h3>Can I change it?</h3><p>Eligibility and bundle conditions need confirmation.</p></div></div><div class="pain"><b>03</b><div><h3>What do I ask?</h3><p>A useful next step takes more than a generic tip.</p></div></div><div class="opportunity-strip"><span>Charges worth reviewing</span><strong>$0–$24<small>/month</small></strong><p>Conditional potential, not guaranteed savings.</p></div></div></div>`,
    `${heading("02 / THE CUSTOMER", "Built for the person<br>paying the internet bill.")}<div class="customer-grid"><div class="persona"><span class="persona-label">THE FIRST CUSTOMER</span><div class="big-number">25–45</div><p>Working adults in the United States<br>who pay for their own home internet.</p><div class="persona-tags">${pill("Own monthly bill")}${pill("Limited time")}${pill("Wants a concrete next step")}</div></div><div class="job"><h3>Make the next provider<br>conversation easier.</h3><div class="job-row">${icon("document")}<span>Understand the charges before calling.</span></div><div class="job-row">${icon("chat")}<span>Bring the right facts and questions.</span></div><div class="job-row">${icon("trend")}<span>Know whether anything actually changed.</span></div><div class="focus-box"><b>One focused starting point</b><p>U.S. residential internet bills.<br>Expand only after validating repeat use.</p></div></div></div>`,
    `${heading("03 / THE SOLUTION", "From a PDF to a clear next move.", "A complete workflow, with the customer in control.")}<div class="workflow">${[
      {
        n: "01",
        i: "upload",
        t: "Bring the bill",
        p: "Upload a real PDF or enter the details manually.",
        f: "Original PDF discarded",
      },
      {
        n: "02",
        i: "document",
        t: "Verify the facts",
        p: "Review amounts, dates and individual charges.",
        f: "Editable before analysis",
      },
      {
        n: "03",
        i: "chat",
        t: "Prepare the call",
        p: "Choose an opportunity and get a grounded script.",
        f: "Evidence + conditions",
      },
      {
        n: "04",
        i: "trend",
        t: "Track the result",
        p: "Record the response and confirmed recurring cost.",
        f: "Persistent outcome history",
      },
    ]
      .map(
        (s) =>
          `<div class="workflow-card"><span class="step-count">${s.n}</span><span class="step-icon">${icon(s.i)}</span><h3>${s.t}</h3><p>${s.p}</p><div class="step-foot">${s.f}</div></div>`,
      )
      .join(
        "",
      )}</div><div class="workflow-bottom"><span>${icon("check")} No registration or provider credentials</span><span>${icon("check")} Human review before analysis</span><span>${icon("check")} You decide which changes to make</span></div>`,
    `${heading("04 / THE LIVE PRODUCT", "Open it. Upload a bill. Take the next step.")}<div class="live-grid"><div>${frame(assets.analysis, "billshield-tyxt.onrender.com / analysis", "live-frame")}<p class="caption">Actual hosted application · synthetic PDF · conditional estimates</p></div><div class="demo-card"><span class="demo-label"><span class="status-dot"></span> LIVE DEMO</span><a href="${LIVE_URL}/demo" aria-label="Open live BillShield demo"><img class="qr" src="${qr}" alt="QR code for the live BillShield application"></a><h3>Scan. No signup.</h3><a class="url" href="${LIVE_URL}">billshield-tyxt.onrender.com</a><ol><li>Choose the equipment sample.</li><li>Review and analyze the bill.</li><li>Prepare a provider conversation.</li></ol></div></div>`,
    `${heading("05 / TRUST & DIFFERENTIATION", "The facts stay visible.<br>The math stays deterministic.")}<div class="trust-grid"><div class="trust-list"><div><span class="trust-icon">${icon("document")}</span><h3>Real extraction + human verification</h3><p>Missing values stay missing. You correct the bill.</p></div><div><span class="trust-icon">${icon("check")}</span><h3>Clear financial boundaries</h3><p>Integer cents. One-time fees stay separate.<br>Overlapping opportunities are not counted twice.</p></div><div><span class="trust-icon">${icon("lock")}</span><h3>A private guest workspace</h3><p>Original PDFs discarded. Guest data expires in 7 days.<br>Users can delete their workspace at any time.</p></div></div><div class="trust-product"><div class="grounded-label">SCRIPT EXCERPT / SYNTHETIC BILL</div><img src="${assets.script}" alt="Actual personalized script for the synthetic internet statement"><div class="trust-product-footer">Potential is not confirmed.<br><span>Recorded savings are user-attested, not independently verified.</span></div></div></div><div class="proof-strip"><span><b>47</b> automated checks passed</span><span><b>3</b> public-site scenarios passed</span><span><b>No API key</b> required for the core workflow</span></div>`,
    `${heading("06 / MONETIZATION", "A monthly habit.<br>A simple subscription hypothesis.")}<div class="pricing-grid"><div class="pricing-context"><p class="large-copy">Start with clarity.<br>Charge for ongoing value.</p><p>Validate repeat bill reviews and willingness to pay before expanding the paid product.</p><div class="validation-list"><span>01 &nbsp; Analysis → action</span><span>02 &nbsp; Repeat monthly use</span><span>03 &nbsp; Paid conversion</span></div></div><div class="plan"><p class="plan-name">FREE</p><div class="price">$0</div><p class="plan-sub">Proposed launch tier</p><ul><li>One bill analysis</li><li>Basic recommendations</li><li>One negotiation script</li></ul><div class="plan-status">Guest experience available today</div></div><div class="plan plus"><div class="plus-label">PROPOSED</div><p class="plan-name">PLUS</p><div class="price">$7.99<span>/mo</span></div><p class="plan-sub">Pricing hypothesis</p><ul><li>Up to 10 analyses monthly</li><li>Longer-term bill history</li><li>Planned reminders & exports</li></ul><div class="plan-status">Checkout is not enabled</div></div></div><p class="slide-disclaimer">Proposed tiers, not a validated price. The current guest demo permits additional bills under safety quotas.</p>`,
    `${heading("07 / BUSINESS POTENTIAL", "A focused wedge.<br>A business you can measure.")}<div class="business-grid"><div class="market-focus"><span class="market-label">START HERE</span><h3>U.S. residential<br>internet bills.</h3><p>One recurring expense. One concrete workflow.<br>Expand category coverage after validation.</p><div class="channel-label">ACQUISITION HYPOTHESES</div><div class="channel">Bill-explainer search</div><div class="channel">Budgeting creators</div><div class="channel">Household communities</div></div><div class="revenue"><p class="kicker">ILLUSTRATIVE REVENUE SCENARIOS</p><div class="revenue-row"><div><strong>1,000</strong><span>paying subscribers</span></div><span class="equals">→</span><div><strong class="mint">$95,880</strong><span>annual recurring revenue</span></div></div><div class="revenue-row"><div><strong>10,000</strong><span>paying subscribers</span></div><span class="equals">→</span><div><strong class="mint">$958,800</strong><span>annual recurring revenue</span></div></div><p class="formula">Paid subscribers × $7.99/month × 12 months</p><p class="scenario-note">Hypothetical scenarios, not users, traction, forecasts or market sizing.<br>Exclude churn, discounts, fees and operating costs.</p></div></div>`,
    `${heading("08 / RETENTION & NEXT STEPS", "The next bill<br>creates the next reason to return.")}<div class="retention-grid"><div><p class="retention-label">THE RETENTION HYPOTHESIS</p><div class="retention-flow"><div><b>01</b><span>A new monthly statement</span></div><i>↓</i><div><b>02</b><span>Review a change or expiring promotion</span></div><i>↓</i><div><b>03</b><span>Take action with the provider</span></div><i>↓</i><div><b>04</b><span>Record the outcome. Revisit next month.</span></div></div></div><div class="north-star"><span class="star-symbol">✦</span><p class="kicker">NORTH STAR</p><h3>Confirmed annualized<br>recurring savings.</h3><p>User-attested reductions, projected over 12 unchanged months.<br>Not money already saved.</p><div class="roadmap"><div><b>NOW</b><span>A complete internet-bill workflow</span></div><div><b>NEXT</b><span>Customer discovery, repeat use, pricing tests</span></div><div><b>LATER</b><span>Durable accounts and mobile-bill support</span></div></div></div></div>`,
    `<div class="closing-copy"><p class="kicker">BILLSHIELD / STOP OVERPAYING. START SAVING.</p><h1>Make your next bill<br><em>make sense.</em></h1><p class="closing-sub">A real product. A focused problem.<br>A clearer next conversation.</p><div class="closing-links"><a href="${LIVE_URL}"><span>TRY THE LIVE PRODUCT</span><b>billshield-tyxt.onrender.com ${icon("arrow")}</b></a><a href="${REPO}"><span>EXPLORE THE PUBLIC SOURCE</span><b>github.com/Eqziz/billshield ${icon("arrow")}</b></a></div></div><div class="closing-qr"><a href="${LIVE_URL}/demo"><img src="${qr}" alt="Scan to open BillShield"></a><strong>Your next step starts here.</strong><p>No signup · Sample PDF available</p></div>`,
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BillShield — From confusing bills to a clear next move</title><meta name="description" content="Ten-slide hackathon pitch for the live BillShield product."><style>${css}</style><!-- Embedded Inter font: ${escape(fontLicense).replaceAll("--", "—")} --></head><body><main class="deck-stage">${slideBodies.map((body, i) => `<section class="slide ${[0, 2, 7, 9].includes(i) ? "dark" : ""} slide-${i + 1} ${i === 0 ? "active" : ""}" data-slide="${i + 1}" data-notes="${escape(notes[i] || "")}"><div class="brand"><span>${shield}</span>BillShield<i>.</i></div>${i > 0 ? `<div class="chapter">${String(i + 1).padStart(2, "0")} / 10</div>` : ""}${body}<footer><span>${i === 0 ? "LIVE WEB PRODUCT · UNITED STATES" : i === 9 ? "CLARITY BEFORE COMMITMENTS" : "BILLSHIELD · HACKATHON PRODUCT PITCH"}</span><span>${String(i + 1).padStart(2, "0")} / 10</span></footer></section>`).join("")}</main><nav class="deck-controls" aria-label="Presentation controls"><button id="prev" aria-label="Previous slide">←</button><span id="counter">01 / 10</span><button id="next" aria-label="Next slide">→</button><button id="notes" aria-label="Toggle presenter notes">Notes · N</button><button id="fullscreen" aria-label="Enter fullscreen">Fullscreen</button><a href="BillShield-pitch.pdf">PDF ↗</a></nav><aside class="speaker-notes" hidden><b>Speaker notes</b><div id="note-body"></div></aside><script>
const slides=[...document.querySelectorAll('.slide')];let current=0;function show(){const requested=Number(location.hash.slice(1))||1;current=Math.max(0,Math.min(9,requested-1));slides.forEach((slide,i)=>{slide.classList.toggle('active',i===current);slide.setAttribute('aria-hidden',String(i!==current));});document.getElementById('counter').textContent=String(current+1).padStart(2,'0')+' / 10';document.getElementById('note-body').textContent=slides[current].dataset.notes||'No notes available.';}function move(delta){location.hash=String(Math.max(1,Math.min(10,current+1+delta)));}function resize(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/1280,innerHeight/720));}document.getElementById('prev').onclick=()=>move(-1);document.getElementById('next').onclick=()=>move(1);document.getElementById('notes').onclick=()=>{document.querySelector('.speaker-notes').hidden=!document.querySelector('.speaker-notes').hidden;};document.getElementById('fullscreen').onclick=()=>document.documentElement.requestFullscreen?.();addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();move(1);}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1);}if(e.key.toLowerCase()==='n')document.getElementById('notes').click();});addEventListener('hashchange',show);addEventListener('resize',resize);show();resize();
</script></body></html>`;
}
