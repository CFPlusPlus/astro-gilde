(function () {
  try {
    var stored = localStorage.getItem('theme');
    var root = document.documentElement;

    if (stored === 'light' || stored === 'dark') {
      root.dataset.theme = stored;
      return;
    }

    root.removeAttribute('data-theme');
  } catch {
    // Absichtlich leer: Rendering soll bei Storage-Fehlern nicht blockieren.
  }
})();
