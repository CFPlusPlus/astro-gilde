/* Home-spezifisches Verhalten (Bootstrap): Module initialisieren und auf Astro-Navigation reagieren. */

import { initHomeGallery } from './home/gallery';
import { initHomePlayers } from './home/players';
import { initHomeQuickNav } from './home/quick-nav';
import { initHomeWorldAge } from './home/world-age';

function initHomeApp(): () => void {
  const stopGallery = initHomeGallery();
  const stopQuickNav = initHomeQuickNav();
  const stopPlayers = initHomePlayers();
  initHomeWorldAge();

  return () => {
    stopPlayers();
    stopGallery();
    stopQuickNav();
  };
}

let cleanup: (() => void) | null = null;

const mountHome = () => {
  cleanup?.();
  cleanup = initHomeApp();
};

const unmountHome = () => {
  cleanup?.();
  cleanup = null;
};

mountHome();
document.addEventListener('astro:before-swap', unmountHome);
document.addEventListener('astro:page-load', mountHome);
