import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stripNikud} from '../src/nikud.js';
import {goQuote} from '../src/goEmit.js';

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

test('goQuote escapes special characters', () => {
  assert.equal(goQuote('plain'), '"plain"');
  assert.equal(goQuote('a"b\\c'), '"a\\"b\\\\c"');
  assert.equal(goQuote('line1\nline2\t!'), '"line1\\nline2\\t!"');
  // UTF-8 passes through unescaped
  assert.equal(goQuote('שלום'), '"שלום"');
});
