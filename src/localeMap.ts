/**
 * Mapping between Hebcal locale names and BCP-47 language tags understood by
 * golang.org/x/text/language.
 *
 * Most Hebcal locales are already valid BCP-47 (de, es, fr, he, yi, ...).
 * Two categories are not, and need special handling:
 *
 *  1. he-x-NoNikud  -- this IS valid BCP-47. language.Parse normalises it to
 *     the lowercase private-use form "he-x-nonikud". We just lowercase it.
 *
 *  2. ashkenazi*    -- these are NOT well-formed BCP-47. The bare name
 *     "ashkenazi" is 9 characters, exceeding the 8-character limit for a
 *     private-use subtag, so even "x-ashkenazi" fails to parse. We therefore
 *     map each to a hand-picked private-use tag whose subtags are all <= 8
 *     chars, anchored on "he" (the underlying content is Hebrew, romanised).
 *
 * The mapping is the single source of truth shared by the generator and, in a
 * later phase, by hebcal-go's LookupTranslation. Both sides MUST agree on it,
 * so it lives in one place and is emitted verbatim into the generated Go.
 */

/** A Hebcal locale that carries a translation dictionary. */
export interface LocaleDef {
  /** Canonical Hebcal locale name, e.g. "he-x-NoNikud" or "ashkenazi_litvish". */
  readonly name: string;
  /** BCP-47 tag used as the catalog.Builder key. */
  readonly tag: string;
}

/**
 * Locales that are pass-through: a lookup returns the key unchanged. They carry
 * no dictionary and are not registered in the catalogue.
 */
export const PASSTHROUGH_LOCALES = ['en', 'sephardic'] as const;

/**
 * All dictionary-bearing locales, in the priority order hebcal-go uses for
 * AllLocales. "en" is prepended to AllLocales separately (it is pass-through).
 */
export const LOCALES: readonly LocaleDef[] = [
  {name: 'ashkenazi', tag: 'he-x-ashkenaz'},
  {name: 'he', tag: 'he'},
  {name: 'he-x-NoNikud', tag: 'he-x-nonikud'},
  {name: 'ashkenazi_komatz', tag: 'he-x-ashk-komatz'},
  {name: 'ashkenazi_litvish', tag: 'he-x-ashk-litvish'},
  {name: 'ashkenazi_poylish', tag: 'he-x-ashk-poylish'},
  {name: 'ashkenazi_romanian', tag: 'he-x-ashk-romanian'},
  {name: 'ashkenazi_standard', tag: 'he-x-ashk-standard'},
  {name: 'de', tag: 'de'},
  {name: 'es', tag: 'es'},
  {name: 'fi', tag: 'fi'},
  {name: 'fr', tag: 'fr'},
  {name: 'hu', tag: 'hu'},
  {name: 'nl', tag: 'nl'},
  {name: 'pl', tag: 'pl'},
  {name: 'pt', tag: 'pt'},
  {name: 'ro', tag: 'ro'},
  {name: 'ru', tag: 'ru'},
  {name: 'uk', tag: 'uk'},
  {name: 'yi', tag: 'yi'},
];

/** Locale name whose dictionary is the source for the baked NoNikud variant. */
export const HEBREW_LOCALE = 'he';

/** Locale name produced by stripping niqqud from {@link HEBREW_LOCALE}. */
export const NONIKUD_LOCALE = 'he-x-NoNikud';

const byName = new Map(LOCALES.map((l) => [l.name, l]));

/** Look up a locale definition by its canonical Hebcal name. */
export function localeByName(name: string): LocaleDef | undefined {
  return byName.get(name);
}

/** Full AllLocales ordering, matching hebcal-go (en first, then dictionaries). */
export function allLocaleNames(): string[] {
  return ['en', ...LOCALES.map((l) => l.name)];
}
