/*
  email-obfuscate.ts
  ------------------
  E-mail obfuscation (CSP friendly).
  The full address is assembled only in the browser.
*/

(() => {
  const safePart = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  };

  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a.js-email[data-user][data-domain]',
  );

  anchors.forEach((anchor) => {
    const user = safePart(anchor.getAttribute('data-user'));
    const domain = safePart(anchor.getAttribute('data-domain'));

    if (!user || !domain) return;

    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(user)) return;
    if (!/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(domain)) return;

    const addr = `${user}@${domain}`;

    const textNode = anchor.querySelector<HTMLElement>('.js-email-text');
    if (textNode) {
      textNode.textContent = addr;
    } else {
      anchor.textContent = addr;
    }

    anchor.setAttribute('href', `mailto:${addr}`);

    if (!anchor.getAttribute('aria-label')) {
      anchor.setAttribute('aria-label', addr);
    }
  });
})();
