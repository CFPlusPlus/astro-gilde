(function () {
  try {
    var root = document.documentElement;
    var reduceMotion = false;

    try {
      reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      reduceMotion = false;
    }

    if (!reduceMotion) {
      root.classList.add('js-motion-prep');

      window.setTimeout(function () {
        if (!root.classList.contains('js-motion')) {
          root.classList.remove('js-motion-prep');
        }
      }, 2500);
    }

    var stored = localStorage.getItem('theme');

    if (stored === 'light' || stored === 'dark') {
      root.dataset.theme = stored;
      return;
    }

    root.removeAttribute('data-theme');
  } catch {
    // Absichtlich leer: Rendering soll bei Storage-Fehlern nicht blockieren.
  }
})();
