import { readBrowserAppConfig } from './app-config';
import { qsa, qs } from './app/dom';
import { initJoinModal } from './app/join-modal';
import { initLiveCounters } from './app/live-counters';
import { initPageMotion } from './app/motion';
import { initNavMenu } from './app/nav-menu';
import { initTheme } from './app/theme';
import { initToast } from './app/toast';

/*
  Globales Verhalten der Seite:
  - Theme-Toggle (system/light/dark) mit localStorage
  - Navbar-Menue-Toggle + Click-Outside + Escape
  - Helper zum Kopieren der Server-IP
  - Online-Zaehler (Discord + Minecraft)
  - Schlanker Toast
*/

(() => {
  const config = readBrowserAppConfig({
    serverIp: 'minecraft-gilde.de',
    discordGuildId: '1219625244906754093',
    discordInvite: 'https://discord.minecraft-gilde.de',
    dynmapUrl: 'https://map.minecraft-gilde.de',
  });

  const toast = initToast(qs);
  initTheme({ qs, qsa, showToast: toast.showToast });

  const menu = initNavMenu({ qs, qsa });
  initJoinModal({
    config,
    qs,
    qsa,
    showToast: toast.showToast,
    closeMenu: menu.closeMenu,
    isMenuOpen: menu.isMenuOpen,
  });

  initLiveCounters({ config, qsa });
  initPageMotion();
})();
