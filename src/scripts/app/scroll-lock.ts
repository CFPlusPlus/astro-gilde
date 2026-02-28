const activeLocks = new Set<string>();
let lockedScrollY = 0;
let savedBodyPosition = '';
let savedBodyTop = '';
let savedBodyLeft = '';
let savedBodyRight = '';
let savedBodyWidth = '';
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

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

function applyBodyLockStyles(): void {
  const { body, documentElement } = document;
  const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

  savedBodyPosition = body.style.position;
  savedBodyTop = body.style.top;
  savedBodyLeft = body.style.left;
  savedBodyRight = body.style.right;
  savedBodyWidth = body.style.width;
  savedBodyOverflow = body.style.overflow;
  savedBodyPaddingRight = body.style.paddingRight;

  body.style.position = 'fixed';
  body.style.top = `-${lockedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflow = 'hidden';
  body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
}

function restoreBodyLockStyles(): void {
  const { body } = document;
  body.style.position = savedBodyPosition;
  body.style.top = savedBodyTop;
  body.style.left = savedBodyLeft;
  body.style.right = savedBodyRight;
  body.style.width = savedBodyWidth;
  body.style.overflow = savedBodyOverflow;
  body.style.paddingRight = savedBodyPaddingRight;
}

export function lockPageScroll(lockId: string): void {
  if (!canUseDom()) return;
  if (activeLocks.has(lockId)) return;

  if (activeLocks.size === 0) {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    applyLockedClasses();
    applyBodyLockStyles();
  }

  activeLocks.add(lockId);
}

export function unlockPageScroll(lockId: string): void {
  if (!canUseDom()) return;
  if (!activeLocks.has(lockId)) return;

  activeLocks.delete(lockId);
  if (activeLocks.size > 0) return;

  removeLockedClasses();
  restoreBodyLockStyles();
  window.scrollTo({ top: lockedScrollY, left: 0, behavior: 'auto' });
}
