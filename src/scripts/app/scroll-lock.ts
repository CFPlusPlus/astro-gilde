const activeLocks = new Set<string>();
let lockedScrollY = 0;

function canUseDom(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function applyLockedClasses(): void {
  document.documentElement.classList.add('mg-scroll-lock');
  document.body.classList.add('mg-scroll-lock');
}

function removeLockedClasses(): void {
  document.documentElement.classList.remove('mg-scroll-lock');
  document.body.classList.remove('mg-scroll-lock');
}

export function lockPageScroll(lockId: string): void {
  if (!canUseDom()) return;
  if (activeLocks.has(lockId)) return;

  if (activeLocks.size === 0) {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    applyLockedClasses();
  }

  activeLocks.add(lockId);
}

export function unlockPageScroll(lockId: string): void {
  if (!canUseDom()) return;
  if (!activeLocks.has(lockId)) return;

  activeLocks.delete(lockId);
  if (activeLocks.size > 0) return;

  removeLockedClasses();
  window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'auto' });
}
