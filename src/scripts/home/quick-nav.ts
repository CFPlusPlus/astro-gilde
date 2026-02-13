const qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export function initHomeQuickNav(): () => void {
  const nav = qs<HTMLElement>('[data-home-quick-nav]');
  if (!nav) return () => {};

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link || !nav.contains(link)) return;

    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#') || href.length < 2) return;

    const id = decodeURIComponent(href.slice(1));
    const section = document.getElementById(id);
    if (!section) return;

    event.preventDefault();
    section.scrollIntoView({
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    });

    if (window.location.hash !== href) {
      history.pushState(null, '', href);
    }
  };

  nav.addEventListener('click', onClick);
  return () => nav.removeEventListener('click', onClick);
}
