#!/usr/bin/env python3
"""Generate the Pan-India Studio Sales Playbook PDF.

Run:  python scripts/generate-sales-playbook.py
Output: public/playbooks/chirpeel-sales-playbook.pdf
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether,
)

OUT = "public/playbooks/chirpeel-sales-playbook.pdf"
NAVY = HexColor("#0B2A4A")
BLUE = HexColor("#1E5AA8")
SOFT = HexColor("#F2F5FA")
MUTED = HexColor("#5B6B7E")
LINE = HexColor("#D8DEE9")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontName="Helvetica-Bold",
                    fontSize=22, leading=28, textColor=NAVY, spaceAfter=10)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontName="Helvetica-Bold",
                    fontSize=14, leading=18, textColor=BLUE, spaceBefore=10, spaceAfter=6)
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontName="Helvetica-Bold",
                    fontSize=11, leading=15, textColor=NAVY, spaceBefore=6, spaceAfter=3)
P  = ParagraphStyle("P",  parent=styles["BodyText"], fontName="Helvetica",
                    fontSize=10, leading=14, textColor=HexColor("#1B2330"), spaceAfter=4)
SMALL = ParagraphStyle("S", parent=P, fontSize=8.5, leading=11, textColor=MUTED)
QUOTE = ParagraphStyle("Q", parent=P, fontName="Helvetica-Oblique",
                       leftIndent=10, textColor=NAVY)
TAG = ParagraphStyle("TAG", parent=SMALL, fontName="Helvetica-Bold",
                     textColor=BLUE, spaceAfter=2)
COVER_T = ParagraphStyle("CT", parent=H1, fontSize=34, leading=40, textColor=white,
                         alignment=TA_LEFT)
COVER_S = ParagraphStyle("CS", parent=P, fontSize=13, leading=18, textColor=white)

def hr():
    t = Table([[""]], colWidths=[170*mm], rowHeights=[0.4])
    t.setStyle(TableStyle([("LINEBELOW", (0,0), (-1,-1), 0.6, LINE)]))
    return t

def bullets(items, style=P):
    return [Paragraph(f"•&nbsp;&nbsp;{x}", style) for x in items]

def box(title, body_html, fill=SOFT):
    inner = [Paragraph(f"<b>{title}</b>", H3)]
    if isinstance(body_html, list):
        for b in body_html:
            inner.append(Paragraph(b, P))
    else:
        inner.append(Paragraph(body_html, P))
    t = Table([[inner]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), fill),
        ("BOX", (0,0), (-1,-1), 0.4, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    return t

def script_block(lang, opener, transl=None):
    rows = [[Paragraph(f"<b>{lang}</b>", H3)],
            [Paragraph(opener, P)]]
    if transl:
        rows.append([Paragraph(f"<i>{transl}</i>", SMALL)])
    t = Table(rows, colWidths=[170*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), NAVY),
        ("TEXTCOLOR",  (0,0), (0,0), white),
        ("BACKGROUND", (0,1), (-1,-1), SOFT),
        ("BOX", (0,0), (-1,-1), 0.4, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    # override H3 text color to white for header cell
    return t

def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 12*mm, "Chirpeel · The Studio Sales Playbook · Pan-India edition")
    canvas.drawRightString(190*mm, 12*mm, f"Page {doc.page}")
    canvas.restoreState()

def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.rect(0, A4[1]-260, 260, 260, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(20*mm, A4[1]-25*mm, "HOMICUBE")
    canvas.setFont("Helvetica", 9)
    canvas.drawString(20*mm, A4[1]-31*mm, "Software for Indian interior studios")
    canvas.setFont("Helvetica-Bold", 34)
    canvas.drawString(20*mm, 110*mm, "The Studio Sales")
    canvas.drawString(20*mm, 96*mm,  "Playbook")
    canvas.setFont("Helvetica", 13)
    canvas.drawString(20*mm, 82*mm, "Pan-India edition  ·  2026")
    canvas.setFont("Helvetica-Oblique", 11)
    canvas.setFillColor(HexColor("#B7C7DD"))
    canvas.drawString(20*mm, 60*mm, "Cold-call openers, WhatsApp follow-ups, objection bridges,")
    canvas.drawString(20*mm, 54*mm, "and 3 closes that work from Mumbai to Madurai.")
    canvas.setFont("Helvetica", 9)
    canvas.drawString(20*mm, 20*mm, "chirpeel.in  ·  Free for studio owners. Steal the whole thing.")
    canvas.restoreState()

def build():
    doc = SimpleDocTemplate(OUT, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=18*mm, bottomMargin=20*mm,
        title="The Studio Sales Playbook — Pan-India edition",
        author="Chirpeel")

    story = []
    # ----- Cover (rendered via onFirstPage) -----
    story.append(Spacer(1, 240*mm))   # blank cover, art drawn in cover_page
    story.append(PageBreak())

    # ----- TOC -----
    story += [
        Paragraph("What's inside", H1),
        hr(), Spacer(1, 6),
        Paragraph("A field-tested playbook for interior-design studios across India. "
                  "Use it on Monday morning. Nothing is theory.", P),
        Spacer(1, 8),
    ]
    toc = [
        ("01", "Who this is for"),
        ("02", "The Indian buyer journey"),
        ("03", "Where good leads come from"),
        ("04", "Cold-call openers in 6 Indian languages"),
        ("05", "Discovery questions that qualify in 8 minutes"),
        ("06", "WhatsApp follow-up cadence (Day 1 → 30)"),
        ("07", "The 7 most common Indian objections"),
        ("08", "Pricing, GST and the discount conversation"),
        ("09", "Site-visit playbook"),
        ("10", "Three closes that work across India"),
        ("11", "Referrals, reviews and Reels"),
        ("12", "30-60-90 day studio targets"),
        ("13", "One-page checklist"),
    ]
    rows = [[n, Paragraph(t, P)] for n, t in toc]
    tt = Table(rows, colWidths=[14*mm, 156*mm])
    tt.setStyle(TableStyle([
        ("FONT", (0,0), (0,-1), "Helvetica-Bold", 10),
        ("TEXTCOLOR", (0,0), (0,-1), BLUE),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("LINEBELOW", (0,0), (-1,-2), 0.3, LINE),
    ]))
    story.append(tt)
    story.append(PageBreak())

    # ----- 01 Who this is for -----
    story += [
        Paragraph("01", TAG),
        Paragraph("Who this is for", H1), hr(), Spacer(1, 6),
        Paragraph("Independent interior-design studios doing 1–10 crore of revenue a year, "
                  "anywhere in India — from Mumbai, Bengaluru, Delhi-NCR, Hyderabad, Chennai, "
                  "Pune, Kolkata, Ahmedabad to Jaipur, Lucknow, Indore, Kochi, Coimbatore, "
                  "Chandigarh, Bhubaneswar, Surat and beyond.", P),
        Spacer(1, 4),
        Paragraph("If you sell modular kitchens, wardrobes, full-home interiors or turnkey "
                  "renovations, this playbook is yours. Steal whatever works. Ignore the rest.", P),
        Spacer(1, 10),
        box("You'll get the most out of this if…", [
            "• You handle 5+ leads a week and at least 1 site visit.",
            "• You sell to homeowners (not just builders or B2B).",
            "• You quote in INR with 18% GST.",
            "• You use WhatsApp as your primary client channel.",
        ]),
    ]
    story.append(PageBreak())

    # ----- 02 Buyer journey -----
    story += [
        Paragraph("02", TAG),
        Paragraph("The Indian buyer journey", H1), hr(), Spacer(1, 6),
        Paragraph("Most home-interior buyers in India go through five stages. "
                  "Knowing which stage your lead is in tells you exactly what to say next.", P),
        Spacer(1, 8),
    ]
    journey = [
        ["Stage", "Who they are", "What they want from you"],
        ["1. Dreaming", "Just-married / new flat owner. Possession 3–6 months away.",
         "Inspiration, Pinterest boards, ballpark prices."],
        ["2. Shopping", "Visiting 3–5 studios. Asking everyone for a quote.",
         "Speed, brand list, one site they can visit."],
        ["3. Deciding", "Has 2 quotes. Comparing scope, brands, GST, timeline.",
         "Confidence. Clear scope. A small win that breaks the tie."],
        ["4. Building", "Token paid. Site work in progress.",
         "Updates, photos, payment clarity, no surprises."],
        ["5. Living", "Moved in. Telling friends about you (or not).",
         "A reason to refer you. A Reel. A Google review nudge."],
    ]
    jt = Table(journey, colWidths=[28*mm, 70*mm, 72*mm])
    jt.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONT", (0,0), (-1,0), "Helvetica-Bold", 10),
        ("FONT", (0,1), (-1,-1), "Helvetica", 9.5),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SOFT]),
        ("GRID", (0,0), (-1,-1), 0.3, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(jt)
    story.append(PageBreak())

    # ----- 03 Lead sources -----
    story += [
        Paragraph("03", TAG),
        Paragraph("Where good leads come from", H1), hr(), Spacer(1, 6),
        Paragraph("Ranked by what we see working for studios across India in 2026. "
                  "Don't try all of these. Pick three and go deep.", P),
        Spacer(1, 6),
    ]
    sources = [
        ("Instagram + Reels", "Highest intent. Before/after Reels of real homes outperform "
         "everything. Post 3x a week. Pin your top 3 to your profile."),
        ("Meta & Google Ads", "Lead-form ads with city + BHK targeting. Budget ₹15–40k/month "
         "to start. Always route to WhatsApp, not a generic form."),
        ("Google Business Profile", "Free. Underrated. Reviews + photos = #1 in 'interior "
         "designer near me'. Ask every happy client for a Google review."),
        ("Justdial / IndiaMART / Sulekha", "Volume but low intent. Useful if you have a "
         "junior who can qualify in 5 minutes. Not for senior designers."),
        ("Builder & broker tie-ups", "Slow to start, compounding. Pick 2 builders in your "
         "city; offer their buyers a free 30-min consult. Pay brokers ethically."),
        ("Society WhatsApp groups", "Most underused. Join your own + 2 friends'. Be helpful, "
         "not salesy. One project a quarter from this is normal."),
        ("Referrals", "Should be 30%+ of revenue by year 2. Build a 90-day after-handover "
         "ritual: photos, anniversary message, referral ask."),
        ("MagicBricks / 99acres", "Co-market with the listing agent. Reach out the day a "
         "flat goes 'Sold'. The buyer needs you."),
    ]
    for name, body in sources:
        story.append(Paragraph(f"<b>{name}</b>", H3))
        story.append(Paragraph(body, P))
        story.append(Spacer(1, 4))
    story.append(PageBreak())

    # ----- 04 Cold-call openers (multilingual) -----
    story += [
        Paragraph("04", TAG),
        Paragraph("Cold-call openers in 6 Indian languages", H1), hr(), Spacer(1, 6),
        Paragraph("First 12 seconds decide if they hang up. State who you are, where you're "
                  "calling from, and ask one specific question. No selling on call 1.", P),
        Spacer(1, 10),
    ]
    openers = [
        ("English", "Hi, this is Priya from Chirpeel Interiors, Bengaluru. I saw your "
         "enquiry on our site for a 2BHK at Whitefield — is now a good 60 seconds "
         "to ask 3 quick questions, or should I call you after 7pm?", None),
        ("Hindi", "Namaste, main Priya bol rahi hoon Chirpeel Interiors se. Aapne hamari "
         "site par 2BHK ke liye enquiry ki thi — kya main 60 second ke liye 3 "
         "chhote sawaal pooch sakti hoon, ya shaam ko call karoon?",
         "(Hindi · Roman script · Mumbai / Delhi / Pune / Lucknow / Jaipur)"),
        ("Tamil", "Vanakkam, naan Priya pesren Chirpeel Interiors-la irundhu. Neenga "
         "2BHK-ku enquiry pannirundheenga — ippo 1 minute pesa mudiyuma, illa "
         "evening 7 manikku call panrena?",
         "(Tamil · Roman script · Chennai / Coimbatore / Madurai / Trichy)"),
        ("Telugu", "Namaste, nenu Priya, Chirpeel Interiors nundi matladuthunna. Meeru "
         "2BHK kosam enquiry chesaru — ippudu 1 nimisham matladagalara, leda "
         "saayantram 7 ki call cheyyana?",
         "(Telugu · Roman script · Hyderabad / Vijayawada / Visakhapatnam)"),
        ("Kannada", "Namaskara, naanu Priya, Chirpeel Interiors-inda kareyutiddene. "
         "Neevu 2BHK ge enquiry maadiddiri — eega 1 nimisha maatanaadabahuda, "
         "athava sanje 7 gante kareyalaa?",
         "(Kannada · Roman script · Bengaluru / Mysuru / Hubballi)"),
        ("Marathi", "Namaskar, mi Priya bolte aahe Chirpeel Interiors madhun. Tumhi "
         "2BHK sathi enquiry keli hoti — ata 1 minute bolayla jamel ka, ki "
         "sandhyakali 7 la phone karu?",
         "(Marathi · Roman script · Mumbai / Pune / Nashik / Nagpur)"),
        ("Bengali", "Namaskar, ami Priya bolchi Chirpeel Interiors theke. Apni 2BHK-er "
         "jonno enquiry korechilen — akhon 1 minute kotha bola jabe, naki "
         "shondhye 7-tay phone korbo?",
         "(Bengali · Roman script · Kolkata / Howrah / Siliguri)"),
    ]
    for lang, opener, sub in openers:
        rows = [[Paragraph(f"<b>{lang}</b>", ParagraphStyle('lh', parent=H3, textColor=white))],
                [Paragraph(opener, P)]]
        if sub:
            rows.append([Paragraph(sub, SMALL)])
        t = Table(rows, colWidths=[170*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (0,0), NAVY),
            ("BACKGROUND", (0,1), (-1,-1), SOFT),
            ("BOX", (0,0), (-1,-1), 0.4, LINE),
            ("LEFTPADDING", (0,0), (-1,-1), 10),
            ("RIGHTPADDING", (0,0), (-1,-1), 10),
            ("TOPPADDING", (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(KeepTogether([t, Spacer(1, 6)]))
    story.append(PageBreak())

    # ----- 05 Discovery questions -----
    story += [
        Paragraph("05", TAG),
        Paragraph("Discovery questions that qualify in 8 minutes", H1), hr(), Spacer(1, 6),
        Paragraph("Ask these in order. Don't pitch until question 12. If they won't answer "
                  "Q1–Q5, they're not a real buyer yet — politely book a follow-up.", P),
        Spacer(1, 8),
    ]
    qs = [
        "Which city and which area is the home in?",
        "Is it a builder flat, resale, villa or independent house?",
        "Carpet area in sq.ft? (or super built-up if they don't know)",
        "BHK and number of bathrooms?",
        "When is possession / when do you want to move in?",
        "Who decides — only you, or you + spouse + parents?",
        "Have you taken a home loan? Will interiors be on EMI?",
        "Budget range you're working with — under 5L, 5–10L, 10–20L, 20L+?",
        "Modular kitchen — L-shape, parallel, U-shape or island?",
        "How many wardrobes? Any walk-in?",
        "False ceiling and lights — full home or only living + master?",
        "Have you got quotes from anyone else? What did you like / dislike?",
    ]
    for i, q in enumerate(qs, 1):
        story.append(Paragraph(f"<b>Q{i:02d}.</b>&nbsp;&nbsp;{q}", P))
    story.append(PageBreak())

    # ----- 06 WhatsApp cadence -----
    story += [
        Paragraph("06", TAG),
        Paragraph("WhatsApp follow-up cadence", H1), hr(), Spacer(1, 6),
        Paragraph("Save these as quick-reply templates. Personalise the [name] and "
                  "[area] before sending. Never send 2 messages in a row without a reply.", P),
        Spacer(1, 8),
    ]
    cadence = [
        ("Day 1 — within 30 minutes",
         "Hi [name], thanks for the call. Sharing 3 things you asked for: "
         "(1) our 2BHK starter package PDF, (2) one site near [area] you can visit "
         "this weekend, (3) a brand list. Reply 'YES' and I'll book the visit."),
        ("Day 3 — soft nudge",
         "Hi [name], did the brand list make sense? Happy to swap any item — most "
         "clients change Hettich → Hafele or Greenply → Centuryply. Want me to send "
         "a swapped quote?"),
        ("Day 7 — value drop",
         "Hi [name], small update — we're locking 2026 rates for 5 more clients this "
         "month before Hettich's price revision. If you want this rate held, a 2% "
         "token works. No pressure."),
        ("Day 14 — re-engage",
         "Hi [name], still thinking it over? Totally fine. Just so you know, we have "
         "one slot opening for [possession month] handover. After that it's "
         "[+1 month]. Want me to hold it for 48 hours?"),
        ("Day 30 — graceful close",
         "Hi [name], I'll stop following up — don't want to be that designer 🙂 "
         "If interiors come back on the table, just send 'GO' and I'll re-open your "
         "file. Wishing you a great move-in either way."),
    ]
    for title, body in cadence:
        story.append(box(title, body))
        story.append(Spacer(1, 6))
    story.append(PageBreak())

    # ----- 07 Objections -----
    story += [
        Paragraph("07", TAG),
        Paragraph("The 7 most common Indian objections", H1), hr(), Spacer(1, 6),
        Paragraph("Don't argue. Acknowledge → reframe → ask. One bridge line each.", P),
        Spacer(1, 8),
    ]
    objs = [
        ('"Local carpenter is doing it for half your price."',
         "Totally fair. The honest difference is materials and warranty — a local "
         "job uses MR ply, ours uses BWP 710 with a 10-year written warranty. "
         "Want me to show you the same kitchen in both, side by side?"),
        ('"My builder is giving free interiors."',
         "Most builder packages cap at ₹1,500/sq.ft and use generic finishes. "
         "Can I send you a 60-second video of what's actually inside a builder "
         "package vs a 2026 modular setup? You decide."),
        ('"Show me one site I can visit."',
         "Yes — sending you 3 nearby completed homes today. Pick whichever is "
         "easiest. Bring your spouse — most decisions get unblocked on the visit."),
        ('"Bhai, thoda discount toh banta hai."',
         "I hear you. I can't move on rate, but I can add free [smart lock OR "
         "chimney upgrade OR 1-year AMC] worth ₹X. Fair?"),
        ('"Can we avoid GST?"',
         "We can't — we're a registered company and your invoice is what protects "
         "your 10-year warranty. But I'll show you where we can genuinely cut "
         "scope and save more than the GST."),
        ('"Will it be done before Diwali / Griha Pravesh?"',
         "If we sign by [date] and you finalise hardware in week 1, yes. I'll put "
         "the date in writing on page 1 of the contract. Late = penalty on us."),
        ('"What if I want changes mid-way?"',
         "Built into our process — 2 free design rounds and 1 free site change. "
         "After that, changes are billed on a small ₹/hour rate. You're never "
         "stuck."),
    ]
    for o, a in objs:
        story.append(Paragraph(o, ParagraphStyle('o', parent=QUOTE, textColor=NAVY)))
        story.append(Paragraph(f"<b>Bridge:</b> {a}", P))
        story.append(Spacer(1, 6))
    story.append(PageBreak())

    # ----- 08 Pricing & GST -----
    story += [
        Paragraph("08", TAG),
        Paragraph("Pricing, GST and the discount conversation", H1), hr(), Spacer(1, 6),
        Paragraph("Three rules that protect your margin and your reputation.", P),
        Spacer(1, 8),
        box("Rule 1 — Always quote with GST inclusive on the headline.",
            "Indian buyers shop on the final number. Show ₹X (incl. 18% GST). "
            "Then break it down. You'll lose fewer leads to 'sticker shock' on page 1."),
        Spacer(1, 6),
        box("Rule 2 — Milestone payments: 10 / 40 / 40 / 10.",
            "10% to lock the design, 40% on factory cutting, 40% on site delivery, "
            "10% on handover. Never accept &lt; 10% upfront — it kills commitment."),
        Spacer(1, 6),
        box("Rule 3 — Replace discount with a bonus.",
            "Discounts train clients to negotiate harder next time. Bonuses "
            "(free smart lock, free 1-year AMC, free crockery unit) preserve the "
            "headline rate and feel more generous."),
    ]
    story.append(PageBreak())

    # ----- 09 Site visit -----
    story += [
        Paragraph("09", TAG),
        Paragraph("Site-visit playbook", H1), hr(), Spacer(1, 6),
        Paragraph("A site visit is your highest-converting moment. Treat it like a "
                  "performance, not an inspection.", P),
        Spacer(1, 6),
        Paragraph("Carry to every visit", H3),
    ]
    story += bullets([
        "Laser distance meter (Bosch GLM 50 or similar).",
        "A4 graph pad + 2 pens (one black, one red for changes).",
        "Sample box: 2 ply pieces, 4 laminates, 2 hardware samples.",
        "Tape, plumb-bob, torch, masking tape for marking.",
        "Pre-printed quotation summary (1 page) + brand list.",
        "Branded shoe-cover bag — small touch, big trust signal.",
    ])
    story += [Spacer(1, 6), Paragraph("Photograph (always)", H3)]
    story += bullets([
        "Every wall, every corner, all 4 directions of every room.",
        "Existing electrical points, AC drains, water inlets.",
        "Door swing direction and head-room.",
        "Window openings and grill type.",
        "Lift dimensions (for slab transport).",
    ])
    story += [Spacer(1, 6), Paragraph("Measure (in this order)", H3)]
    story += bullets([
        "Wall-to-wall length, then height (floor to slab, not floor to false ceiling).",
        "Door / window cut-outs with offsets.",
        "Any beam / column projections.",
        "Plumbing point centres (for kitchen + bathrooms).",
        "Electrical point heights (for switchboards behind wardrobes).",
    ])
    story.append(PageBreak())

    # ----- 10 Three closes -----
    story += [
        Paragraph("10", TAG),
        Paragraph("Three closes that work across India", H1), hr(), Spacer(1, 6),
        Paragraph("Use one — never all three. The right close depends on what's "
                  "actually blocking the client.", P),
        Spacer(1, 8),
        Paragraph("Close 1 — The Festival / Griha-Pravesh close", H2),
        Paragraph("<i>Use when:</i> client has a fixed move-in date around Diwali, "
                  "Pongal, Onam, Ugadi, Eid, or a planned Griha Pravesh.", P),
        Paragraph("<b>Line:</b> &ldquo;If we sign this week, I can guarantee handover "
                  "by [festival date] in writing — with a penalty clause on us if "
                  "we slip. After this week, the next slot is [+1 month]. Shall I "
                  "block the factory?&rdquo;", P),
        Spacer(1, 8),
        Paragraph("Close 2 — The EMI / no-cost-EMI close", H2),
        Paragraph("<i>Use when:</i> budget is the real block, especially for "
                  "salaried buyers in metros.", P),
        Paragraph("<b>Line:</b> &ldquo;Your full home at ₹X works out to ₹Y per "
                  "month on a 12-month no-cost EMI through HDFC / Bajaj — less "
                  "than your current rent. Want me to share the EMI sheet for "
                  "your spouse?&rdquo;", P),
        Spacer(1, 8),
        Paragraph("Close 3 — The 'lock the brand list' close", H2),
        Paragraph("<i>Use when:</i> client keeps asking for &ldquo;one more day to "
                  "decide&rdquo; — they're stuck in comparison mode.", P),
        Paragraph("<b>Line:</b> &ldquo;Let's not commit the full project today. "
                  "Just lock the brand list — Hettich, Greenply, Merino — at "
                  "today's rate with a 2% refundable token. Hettich revises "
                  "1st of next month. If you don't proceed, full refund. "
                  "Either way you save ₹Z.&rdquo;", P),
    ]
    story.append(PageBreak())

    # ----- 11 Referrals & reviews -----
    story += [
        Paragraph("11", TAG),
        Paragraph("Referrals, reviews and Reels", H1), hr(), Spacer(1, 6),
        Paragraph("The cheapest leads in India come from your last happy client. "
                  "Most studios forget to ask. Build a 90-day after-handover ritual.", P),
        Spacer(1, 8),
        Paragraph("Day +7 after handover", H3),
        Paragraph("Send a 30-second walkthrough Reel of <i>their</i> home (with "
                  "permission). Most clients re-share it on their own status — "
                  "that's free reach to their entire society.", P),
        Paragraph("Day +30", H3),
        Paragraph("Send a Google review link with a 1-tap pre-filled message. "
                  "Conversion is 3x higher than a plain ask.", P),
        Paragraph("Day +60", H3),
        Paragraph("&ldquo;If you know one neighbour who's also doing up their flat, "
                  "I'll give them a free 30-min consult and you a ₹5,000 voucher "
                  "credit on any add-on (chimney upgrade, smart lock, AMC).&rdquo;", P),
        Paragraph("Day +90 and every anniversary", H3),
        Paragraph("A real photo, a real message — &ldquo;1 year in your home today. "
                  "Anything we can tighten / fix / refresh?&rdquo; Most studios never "
                  "do this. Be the one that does.", P),
    ]
    story.append(PageBreak())

    # ----- 12 30-60-90 -----
    story += [
        Paragraph("12", TAG),
        Paragraph("30-60-90 day studio targets", H1), hr(), Spacer(1, 6),
        Paragraph("Healthy ratios for a studio doing ₹1.5–3 crore/year. "
                  "Adjust by 1.5x for metros, 0.7x for tier-3.", P),
        Spacer(1, 8),
    ]
    targets = [
        ["Metric", "Day 30", "Day 60", "Day 90"],
        ["New leads", "30", "70", "120"],
        ["Qualified (passed Q1–Q5)", "12", "30", "55"],
        ["Site visits booked", "6", "16", "28"],
        ["Quotations sent", "5", "13", "24"],
        ["Tokens received", "1", "3", "6"],
        ["Referrals received", "0", "1", "3"],
        ["Google reviews collected", "1", "4", "10"],
    ]
    tt = Table(targets, colWidths=[60*mm, 30*mm, 30*mm, 30*mm])
    tt.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONT", (0,0), (-1,0), "Helvetica-Bold", 10),
        ("FONT", (0,1), (-1,-1), "Helvetica", 10),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, SOFT]),
        ("GRID", (0,0), (-1,-1), 0.3, LINE),
        ("ALIGN", (1,0), (-1,-1), "CENTER"),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(tt)
    story.append(PageBreak())

    # ----- 13 Checklist -----
    story += [
        Paragraph("13", TAG),
        Paragraph("One-page checklist — print this", H1), hr(), Spacer(1, 6),
        Paragraph("Stick this on your studio wall. If every team member follows "
                  "it, your conversion goes up 20–30% in 90 days. We've seen it.", P),
        Spacer(1, 8),
        Paragraph("Every new lead", H3),
    ]
    story += bullets([
        "Reply on WhatsApp within 30 minutes (template-ready).",
        "Run the 12 discovery questions on call 1.",
        "Tag city + BHK + budget band + possession month in your CRM.",
        "Book site visit within 7 days, or move to nurture.",
    ])
    story += [Spacer(1, 6), Paragraph("Every quotation sent", H3)]
    story += bullets([
        "Headline price <b>incl. 18% GST</b>.",
        "Brand list locked with model numbers.",
        "Milestone schedule (10 / 40 / 40 / 10) on page 1.",
        "Handover date in writing.",
        "One bonus item (not a discount).",
    ])
    story += [Spacer(1, 6), Paragraph("Every handover", H3)]
    story += bullets([
        "30-sec walkthrough Reel within 7 days.",
        "Google review nudge on Day 30.",
        "Referral ask on Day 60.",
        "Anniversary check-in every year.",
    ])
    story += [
        Spacer(1, 14),
        hr(), Spacer(1, 6),
        Paragraph("<b>That's the playbook.</b> Now go book a site visit.", H2),
        Paragraph("Built by Chirpeel — the operating system for Indian interior "
                  "studios. Leads, quotations, BOQs, vendor POs, client portal — "
                  "one workspace. <b>chirpeel.in</b>", P),
    ]

    doc.build(story, onFirstPage=cover_page, onLaterPages=page_footer)
    print(f"Wrote {OUT}")

if __name__ == "__main__":
    build()