## Goal

Rewrite the landing hero so it speaks directly to **interior designers and studio owners** — not a generic "designer" audience. The current copy ("One studio app for designers / who actually design") is clever but vague. We'll make it instantly clear who it's for and what changes for them.

## Scope

Only `src/components/landing-v2/SkyHero.tsx` — copy + a small trust micro-row above the CTAs. No layout, animation, or background changes. Nav, app mockup, and "Watch the launch video" button stay as-is.

## New copy

**Eyebrow (new, small chip above headline)**
`For interior design studios in India`

**Headline** (replaces "One studio app for designers / who actually design")

```
Run Your Interior Projects Without Chaos—from lead to handover in one place
```

- Line 1 plain, line 2 in italic display serif (keeps current treatment).
- "studio OS" reads as a category, not a tool — premium tone.

**Subheadline** (replaces current paragraph)

```
Run your entire studio from one place — leads, site visits, BOQ
quotations, vendor POs, payments and the client portal. With AI
that handles follow-ups, drafts quotes and keeps every project on
track, so you can get back to designing.
```

Designer-specific nouns: *site visits, BOQ, vendor POs, client portal* — these are the words an interior designer recognises as "this is built for me."

**Primary CTA**

- Change "Sign up" → `Start free — no card needed`
- Keep `Talk to sales` as secondary.

**Micro trust row** (new, small text directly under CTAs, above the "Watch launch video" button)

```
Trusted by 500+ studios · Mumbai · Bengaluru · Delhi NCR · Chennai · Pune
```

Small, muted, single line, wraps on mobile. Reinforces the geographic + scale signal that already lives further down in `LogoStrip`, but here it lifts conversion at the fold.

## Visual / structure

```text
[ eyebrow chip: For interior design studios in India ]

         The studio OS for
         interior designers          <- italic line 2

   [ subheadline 2 lines, designer vocabulary ]

   [ Start free — no card needed ] [ Talk to sales ]

   Trusted by 500+ studios · Mumbai · Bengaluru · ...

         [ ▶ Watch the launch video ]

              [ App mockup ]
```

- Eyebrow: same primary-blue uppercase tracking style already used on `LogoStrip` ("Trusted by studios").
- Trust row: `text-xs text-foreground/65`, centred, `flex-wrap`, dot separators.
- Everything else (font sizes, spacing, animations, mockup) untouched.

## Technical changes

- File: `src/components/landing-v2/SkyHero.tsx`
  - Add eyebrow `<motion.div>` before the `<motion.h1>` using existing `fadeUp` variant.
  - Replace `<h1>` text content (keep classes).
  - Replace `<p>` text content (keep classes).
  - Update primary `<Link to="/signup">` label to "Start free — no card needed".
  - Add a new `<motion.div>` trust row between the CTA group and the "Watch the launch video" button.
- No new imports, no new dependencies, no data file edits.
- SEO: also update the `<title>`/`<meta description>` in `src/pages/LandingV2.tsx` so they match the new positioning ("studio OS for interior designers").

## Out of scope

- No changes to other sections (Pain points, Solutions, Outcomes, etc.).
- No A/B variants — single new version.
- No new images or components.