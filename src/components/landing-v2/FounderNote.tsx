import SkyBackdrop from "./SkyBackdrop";

export default function FounderNote() {
  return (
    <SkyBackdrop variant="soft" className="py-24">
      <div className="container mx-auto section-padding max-w-3xl">
        <div className="rounded-3xl bg-background/95 backdrop-blur border border-foreground/10 shadow-xl p-8 sm:p-12">
          <p className="text-base sm:text-lg text-foreground/85 leading-relaxed">
            We started <strong className="font-bold">Chirpeel</strong> because every interior designer
            we spoke to across India was running their studio on a stack of
            spreadsheets, WhatsApp groups and memory. Quotations took hours. Vendor follow-ups got
            lost. Clients had no clarity.
          </p>
          <p className="mt-4 text-base sm:text-lg text-foreground/85 leading-relaxed">
            We believe studios should run on one calm app — leads, quotations, projects and the
            client portal in one place — so designers can focus on the part they actually love:
            designing beautiful homes.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold flex items-center justify-center">
              HC
            </div>
            <div>
              <div className="font-display font-bold">Chirpeel Team</div>
              <div className="text-xs text-muted-foreground">India · Pan-India support</div>
            </div>
          </div>
        </div>
      </div>
    </SkyBackdrop>
  );
}