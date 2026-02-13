export type Qs = <T extends Element>(sel: string, root?: ParentNode) => T | null;
export type Qsa = <T extends Element>(sel: string, root?: ParentNode) => T[];

export const qs: Qs = <T extends Element>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);

export const qsa: Qsa = <T extends Element>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));
