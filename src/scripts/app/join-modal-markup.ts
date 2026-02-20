const DEFAULT_SERVER_IP = 'minecraft-gilde.de';
const DEFAULT_MC_VERSION = '1.21.x';

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const buildJoinModalMarkup = ({
  serverIp,
  mcVersion,
}: {
  serverIp?: string;
  mcVersion?: string;
}): string => {
  const safeServerIp = escapeHtml(serverIp?.trim() || DEFAULT_SERVER_IP);
  const safeMcVersion = escapeHtml(mcVersion?.trim() || DEFAULT_MC_VERSION);

  return `
<div
  id="join-modal"
  class="fixed inset-0 z-[70] overflow-y-auto overscroll-contain p-2 sm:p-4"
  data-join-modal
  aria-hidden="false"
>
  <div class="mg-glass-overlay absolute inset-0" data-join-modal-overlay></div>

  <div class="relative mx-auto flex min-h-full w-full items-center justify-center py-2 sm:py-4">
    <section
      class="mg-glass--strong max-h-[calc(100dvh-1rem)] w-full max-w-4xl overflow-y-auto rounded-[var(--radius)] shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
      data-join-modal-dialog
      tabindex="-1"
    >
      <header
        class="border-border/80 bg-surface/80 flex items-center justify-between border-b px-4 py-4 sm:px-6"
      >
        <h2 id="join-modal-title" class="text-xl font-semibold tracking-tight">
          Jetzt auf Minecraft Gilde spielen
        </h2>

        <button
          type="button"
          class="focus-visible:ring-offset-bg inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-lg bg-transparent text-fg transition-colors hover:bg-transparent hover:text-accent focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2"
          aria-label="Schliessen"
          data-join-modal-close
        >
          <span aria-hidden="true">✕</span>
        </button>
      </header>

      <div class="space-y-4 p-3 sm:p-5">
        <article class="border-border/70 bg-surface/45 rounded-[var(--radius)] border p-4 sm:p-5">
          <h3 class="text-base font-semibold sm:text-xl">Schritt 1: Minecraft Java installieren</h3>
          <p class="text-muted mt-3 text-sm leading-relaxed sm:text-base">
            Starte den Minecraft Launcher und waehle die Java-Edition. Fuer unseren Server brauchst du
            keine Bedrock-Version.
          </p>
        </article>

        <article class="border-border/70 bg-surface/45 rounded-[var(--radius)] border p-4 sm:p-5">
          <h3 class="text-base font-semibold sm:text-xl">
            Schritt 2: Mit unserem Java-Server verbinden
          </h3>

          <div class="border-border/70 bg-surface/55 mt-3 rounded-xl border p-3 sm:p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex min-w-0 flex-col gap-2">
                <div class="text-muted text-xs font-semibold tracking-wide uppercase">Server-IP</div>
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                  <code
                    class="text-accent border-0 bg-transparent p-0 text-base font-semibold break-all sm:text-2xl"
                  >
                    ${safeServerIp}
                  </code>
                  <button
                    type="button"
                    class="mg-copy-ip-btn mg-copy-ip-btn--modal"
                    aria-label="Server-IP kopieren"
                    data-copy-ip-modal
                  >
                    <span class="relative inline-flex items-center justify-center">
                      <span
                        class="inline-flex items-center gap-2 transition-opacity duration-150"
                        data-copy-ip-modal-state-default
                      >
                        <span>IP kopieren</span>
                      </span>
                      <span
                        class="pointer-events-none absolute inset-0 inline-flex items-center justify-center gap-2 opacity-0 transition-opacity duration-150"
                        data-copy-ip-modal-state-success
                        aria-hidden="true"
                      >
                        <span>IP kopiert</span>
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <div class="text-sm">
                <p class="text-muted">
                  Version: <span class="text-fg font-semibold">Java ${safeMcVersion}</span>
                </p>
                <p class="text-muted">
                  Port: <span class="text-fg font-semibold">25565</span>
                </p>
                <div class="border-border/70 bg-surface mt-2 rounded-lg border p-2">
                  <p class="text-muted text-xs">
                    Meist reicht die Server-Adresse aus. Port <span class="text-fg font-medium">25565</span>
                    nur angeben, wenn dein Client es ausdruecklich verlangt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="border-border/70 bg-surface/45 rounded-[var(--radius)] border p-4 sm:p-5">
          <div class="flex items-center gap-3">
            <span class="mg-status-dot h-3 w-3 rounded-full bg-emerald-400"></span>
            <h3 class="text-base font-semibold sm:text-xl">Serverstatus</h3>
          </div>
          <p class="text-muted mt-3 text-sm sm:text-base">
            Aktuell online: <span class="text-fg font-semibold" data-mc-online>0</span> Spieler
          </p>
        </article>
      </div>

      <footer class="border-border/80 bg-surface/70 border-t px-4 py-4 text-right sm:px-6">
        <button type="button" class="mg-btn mg-btn--md mg-btn--primary" data-join-modal-close>
          Verstanden
        </button>
      </footer>
    </section>
  </div>
</div>
  `.trim();
};
