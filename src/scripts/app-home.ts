/* Home-spezifisches Verhalten: Einmal pro Mount initialisieren und Cleanup zurueckgeben. */

import { initHomeGallery } from './home/gallery';
import { initHomePlayers } from './home/players';
import { initHomeQuickNav } from './home/quick-nav';
import { initHomeWorldAge } from './home/world-age';

export function initHomeApp(): () => void {
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
