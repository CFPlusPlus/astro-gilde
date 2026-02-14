import { initAccordionMotion } from './accordion';
import { initRevealMotion } from './reveal';

export const initPageMotion = (root: ParentNode = document): (() => void) => {
  const stopReveal = initRevealMotion(root);
  const stopAccordion = initAccordionMotion(root);

  return () => {
    stopAccordion();
    stopReveal();
  };
};
