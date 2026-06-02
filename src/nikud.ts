/**
 * Strip Hebrew niqqud (vowel points) and cantillation marks from a string.
 *
 * This is a faithful port of hebcal-go's HebrewStripNikkud (locales/nikud.go):
 *
 *   if r < 0x0590 || r > 0x05c7 || (r > 0x05bd && r < 0x05bf) { keep }
 *
 * In other words, keep every rune EXCEPT those in the Hebrew points/accents
 * block U+0590..U+05C7. The single carve-out `r > 0x05bd && r < 0x05bf` spares
 * only U+05BE (MAQAF); U+05BF (RAFE) is NOT spared and is stripped. Letters
 * (U+05D0..U+05EA), punctuation and everything outside the block pass through.
 *
 * Keeping this identical to the Go implementation guarantees the baked
 * he-x-NoNikud catalogue matches what hebcal-go produced at runtime.
 */
export function stripNikud(str: string): string {
  let out = '';
  for (const ch of str) {
    const r = ch.codePointAt(0)!;
    if (r < 0x0590 || r > 0x05c7 || (r > 0x05bd && r < 0x05bf)) {
      out += ch;
    }
  }
  return out;
}
