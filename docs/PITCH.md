# BillShield · pitch deck

10 slides · 16:9 · approximately 3 minutes, plus an optional live demo.
Both slides and speaker notes are in English. All product screenshots were captured from the actual hosted application using a labeled fictional bill. No real provider was contacted; no real savings, customer traction or paid conversion is claimed.

- Live product: https://billshield-tyxt.onrender.com
- Public source: https://github.com/Eqziz/billshield
- PDF: [BillShield-pitch.pdf](BillShield-pitch.pdf)
- Offline presentation: [BillShield-pitch.html](BillShield-pitch.html)
- Overview: [BillShield-pitch-preview.png](BillShield-pitch-preview.png)

Build: `npm run pitch`. Requires `npx playwright install chromium` once. Refresh screenshots with `npm run pitch:capture`; it creates an isolated guest and deletes its own synthetic workspace afterward. Editable layouts and copy: `scripts/pitch/deck.ts`; design: `scripts/pitch/theme.css`. This file contains the narrative and speaker notes embedded in the HTML.

HTML controls: arrows, Space, PageUp/PageDown; N toggles notes; Fullscreen enters presentation mode. Slides, fonts, screenshots and QR images work offline. Live product links require internet.

## 1. Your internet bill. Finally, understood.

A clearer bill. A better next step.
Understand your charges. Prepare the conversation. Track what actually changes.
U.S. residential internet · B2C · ages 25–45 · no signup.

### Speaker notes

[15 seconds] BillShield helps you understand your home internet bill and prepare your next provider conversation. We start with working adults in the United States who pay their own bills. The product is already live and works without registration.

## 2. One total. Too many unanswered questions.

Synthetic statement: $75 service + $15 equipment rental + $9 security add-on = $99.
Three questions: What is this charge? Can I change it? What do I ask?
Potential recurring reduction: $0–$24/month, only if eligible charges can be removed.

### Speaker notes

[20 seconds] This fictional statement combines service, equipment and an add-on into a $99 total. We are not assuming these charges are unnecessary. We help the customer understand them and ask whether alternatives are available. The $0–$24 range is conditional potential, not promised savings.

## 3. Built for the person paying the internet bill.

Working adults aged 25–45 in the United States.
Pay their own internet bill, have limited time and want an actionable next step.
Start with residential internet; expand only after validating repeat use.

### Speaker notes

[15 seconds] Our customer needs clear facts, useful questions and less preparation before calling a provider. We deliberately focused the first release on residential internet so that one complete journey works well from beginning to end.

## 4. From a PDF to a clear next move.

1. Bring the bill: real PDF or manual entry.
2. Verify the facts: correct amounts, dates and charges.
3. Prepare the call: evidence-backed recommendation and personalized script.
4. Track the result: provider response and confirmed recurring price.

### Speaker notes

[20 seconds] Upload, review, analysis, a conversation script and outcome tracking are connected. Unknown amounts stay missing until the customer corrects them. Human confirmation happens before analysis. BillShield never changes the customer's plan or requires their provider credentials.

## 5. Open it. Upload a bill. Take the next step.

Actual hosted product screenshot, not a mockup.
QR and clickable link: https://billshield-tyxt.onrender.com/demo
No signup. A synthetic sample PDF is available in the upload screen.

### Speaker notes

[20 seconds without demo; optionally add 60–90 seconds] Scan the QR code to try the same workflow. For a short demo, select the equipment sample, review the $99 total and three charges, confirm, and open the equipment recommendation. Show the script using the actual $99 statement and $15 rental fee. If time permits, record a clearly labeled synthetic outcome and refresh the dashboard. Never present demonstration outcomes as real customer savings. Open the site before presenting: the free Render service may need to wake from inactivity.

## 6. The facts stay visible. The math stays deterministic.

Real PDF extraction plus mandatory human review.
Integer-cent calculations; one-time fees and overlapping opportunities handled separately.
Original PDFs discarded; isolated seven-day guests and deletion controls.
47 automated checks and 3 public-site browser/API scenarios passed.
Core extraction, rules and scripts work without an AI API key.

### Speaker notes

[25 seconds] Trust comes from calculations you can inspect. Rules calculate integer cents; an LLM is never the source of financial arithmetic. Potential and confirmed savings are separate. One-time fees are not annualized, and overlapping opportunities are not added twice. Outcomes are currently confirmed by the user, not independently verified with a provider. The public-site tests included data isolation between guests.

## 7. A monthly habit. A simple subscription hypothesis.

Proposed Free: one analysis, basic recommendations and one script.
Proposed Plus: $7.99/month, ten analyses, longer history and planned reminders/exports.
Checkout is not enabled; price and willingness to pay remain hypotheses.
Current guest demo allows additional bills under safety quotas.

### Speaker notes

[20 seconds] The proposed model is freemium. A first analysis provides an accessible starting point. Plus at $7.99 is a hypothesis about ongoing reviews, history and future follow-up features. There is no active checkout or proven paid conversion. The next experiments measure repeat use and willingness to pay.

## 8. A focused wedge. A business you can measure.

Initial wedge: U.S. residential internet.
Acquisition hypotheses: bill-explainer search, budgeting creators and household communities.
Illustrative scenarios: 1,000 paying subscribers × $7.99 × 12 = $95,880 ARR; 10,000 = $958,800 ARR.
These are arithmetic scenarios, not actual subscribers, forecasts or market sizing. They exclude churn, discounts, fees and operating costs.

### Speaker notes

[20 seconds] We show transparent subscription arithmetic. At this proposed price, one thousand paying subscribers would represent roughly $96,000 of annual recurring revenue before expenses. These are scenarios, not a forecast or existing revenue. Acquisition channels also need validation, starting with content about bills and communities focused on household spending.

## 9. The next bill creates the next reason to return.

Retention hypothesis: new statement → review a change → provider action → recorded outcome → next month.
North Star: user-confirmed annualized recurring savings, projected over twelve unchanged months.
Now: complete internet workflow. Next: customer discovery, repeat use and pricing tests. Later: durable accounts and mobile-bill support.

### Speaker notes

[20 seconds] The next statement creates another reason to return: a changed price, an expiring promotion or a previous action to follow up. Our North Star is a user-confirmed recurring reduction, annualized over twelve unchanged months. That annualized number is a projection, not cash already saved. Retention is still a hypothesis to test with customers.

## 10. Make your next bill make sense.

Live demo: https://billshield-tyxt.onrender.com
Public source: https://github.com/Eqziz/billshield
A real product. A focused problem. A clearer next conversation.
No team names or credentials are invented. Add confirmed participant information to the editable closing layout if needed.

### Speaker notes

[10 seconds] BillShield turns a confusing bill into reviewed facts and a concrete next step. The product is live, and the source is public. Try it through the QR code without signing up. Thank you.
