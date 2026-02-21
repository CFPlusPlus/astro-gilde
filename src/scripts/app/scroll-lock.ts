let activeScrollLocks = 0;

type ScrollLockState = {
  scrollY: number;
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
};

let scrollLockState: ScrollLockState | null = null;

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
  );
};

const applyScrollLock = (): void => {
  const root = document.documentElement;
  const body = document.body;
  const scrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  const computedBodyPaddingRight =
    Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

  scrollLockState = {
    scrollY,
    htmlOverflow: root.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
  };

  root.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${computedBodyPaddingRight + scrollbarWidth}px`;
  }

  if (!isIOS()) return;
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
};

const releaseScrollLock = (): void => {
  if (!scrollLockState) return;

  const root = document.documentElement;
  const body = document.body;
  const { scrollY } = scrollLockState;

  root.style.overflow = scrollLockState.htmlOverflow;
  body.style.overflow = scrollLockState.bodyOverflow;
  body.style.paddingRight = scrollLockState.bodyPaddingRight;
  body.style.position = scrollLockState.bodyPosition;
  body.style.top = scrollLockState.bodyTop;
  body.style.left = scrollLockState.bodyLeft;
  body.style.right = scrollLockState.bodyRight;
  body.style.width = scrollLockState.bodyWidth;

  scrollLockState = null;
  window.scrollTo(0, scrollY);
};

export const acquireScrollLock = (): (() => void) => {
  activeScrollLocks += 1;
  if (activeScrollLocks === 1) applyScrollLock();

  let released = false;
  return () => {
    if (released) return;
    released = true;

    activeScrollLocks = Math.max(0, activeScrollLocks - 1);
    if (activeScrollLocks === 0) releaseScrollLock();
  };
};
