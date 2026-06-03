import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stripNikud} from '../src/nikud.js';
import {goQuote} from '../src/goEmit.js';
import {LOCALES} from '../src/localeMap.js';

test('stripNikud removes vowel points and accents', () => {
  // יִשְׂרָאֵל (with niqqud) -> ישראל (bare letters)
  assert.equal(stripNikud('יִשְׂרָאֵל'), 'ישראל');
  // לוּחַ עִבְרִי -> לוח עברי
  assert.equal(stripNikud('לוּחַ עִבְרִי'), 'לוח עברי');
});

test('stripNikud preserves maqaf (U+05BE) but strips rafe (U+05BF)', () => {
  assert.equal(stripNikud('א־ב'), 'א־ב'); // maqaf kept
  assert.equal(stripNikud('אֿב'), 'אב'); // rafe stripped
});

test('stripNikud leaves non-Hebrew untouched', () => {
  assert.equal(stripNikud('Shabbat Shalom'), 'Shabbat Shalom');
});

test('ashkenazi tags anchor on und, never he', () => {
  // he-x-* would make x/text treat these as children of "he", so a missing
  // ashkenazi key would wrongly fall back to the Hebrew catalogue instead of
  // the English key. They must anchor on the neutral "und" root.
  const ashkenazi = LOCALES.filter((l) => l.name.startsWith('ashkenazi'));
  assert.ok(ashkenazi.length > 0, 'expected ashkenazi locales');
  for (const l of ashkenazi) {
    assert.ok(
      l.tag.startsWith('und-x-'),
      `${l.name} should map to an und-x-* tag, got ${l.tag}`,
    );
    // Every private-use subtag must still fit BCP-47's 8-char limit.
    for (const sub of l.tag.split('-')) {
      assert.ok(sub.length <= 8, `subtag ${sub} of ${l.tag} exceeds 8 chars`);
    }
  }
});

test('goQuote escapes special characters', () => {
  assert.equal(goQuote('plain'), '"plain"');
  assert.equal(goQuote('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(goQuote('line1\nline2\t!'), '"line1\\nline2\\t!"');
  // UTF-8 passes through unescaped
  assert.equal(goQuote('שלום'), '"שלום"');
});
