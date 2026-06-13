import { useState } from "react";
import { SKILLS, SKILL_CATEGORIES, SkillCategory } from "./data";

export default function SkillsGrid() {
  const [active, setActive] = useState<SkillCategory>("Featured");
  const filtered = SKILLS.filter((s) => s.cats.includes(active));

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto section-padding max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
            Skills and automations <span className="text-gradient">set work in motion</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground">
            Chirpeel works in the background so you can focus on design. Automate the repetitive,
            delegate the tedious.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
          {SKILL_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all ${
                active === c
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <a
              key={s.title}
              href="#"
              className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-3">{s.emoji}</div>
              <h3 className="font-display font-bold text-base mb-1.5 group-hover:text-primary transition-colors">{s.title}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{s.desc}</p>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">Connects</span>
                {s.connects.map((c) => (
                  <span key={c} className="text-[10px] font-semibold text-foreground/70 bg-muted px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}