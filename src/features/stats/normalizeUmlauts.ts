function isVowel(value: string): boolean {
  return /[AEIOUYaeiouyÄÖÜäöü]/.test(value);
}

function replaceUmlautPair(input: string, pair: string, replacement: string): string {
  return input.replaceAll(pair, (match, index, source) => {
    if (index <= 0) return replacement;
    const previous = source[index - 1] || '';
    if (isVowel(previous)) return match;
    return replacement;
  });
}

export function normalizeUmlauts(input: string): string {
  let next = String(input ?? '');
  next = replaceUmlautPair(next, 'Ae', '\u00c4');
  next = replaceUmlautPair(next, 'Oe', '\u00d6');
  next = replaceUmlautPair(next, 'Ue', '\u00dc');
  next = replaceUmlautPair(next, 'ae', '\u00e4');
  next = replaceUmlautPair(next, 'oe', '\u00f6');
  next = replaceUmlautPair(next, 'ue', '\u00fc');
  return next;
}
