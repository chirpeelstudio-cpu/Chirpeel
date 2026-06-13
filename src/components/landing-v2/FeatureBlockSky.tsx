import { ReactNode } from "react";
import SkyBackdrop from "./SkyBackdrop";

interface Props {
  eyebrow?: string;
  title: string;
  desc: string;
  detail: string;
  replaces: string[];
  mockup: ReactNode;
  reverse?: boolean;
}

export default function FeatureBlockSky({ eyebrow, title, desc, detail, replaces, mockup, reverse }: Props) {
  return (
    <SkyBackdrop className="py-20 sm:py-28">
      <div className="container mx-auto section-padding">
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div>{mockup}</div>
          <div className="text-foreground/90">
            {eyebrow && (
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/60 mb-3">
                {eyebrow}
              </div>
            )}
            <h3 className="font-display text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">
              {title}
            </h3>
            <p className="mt-4 text-lg text-foreground/80">{desc}</p>
            <p className="mt-2 text-sm text-foreground/70">{detail}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60">Replaces</span>
              {replaces.map((r) => (
                <span key={r} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-background/85 backdrop-blur border border-foreground/10 shadow-sm">
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SkyBackdrop>
  );
}