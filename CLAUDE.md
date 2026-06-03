# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A code generator: it reads Hebcal's gettext `.po` translation files and emits Go
source that populates a `golang.org/x/text/message/catalog` catalogue. It is the
successor to the older `po2golang.js` (which emitted static `map[string]string`
tables). The generator is TypeScript/Node; the *output* is Go.

End goal (later phase): the generated `LookupTranslation(key, locale) (string, bool)`
replaces the hand-maintained one in `hebcal-go/locales/locales.go`.

## Commands

```sh
npm install
npm run build          # tsc -> dist/
npm test               # tsx --test test/*.test.ts (unit: niqqud, Go quoting)
npm run generate -- --out generated --config repos.json   # produce Go
npm run verify         # generate (with --test) then `go test` the output
```

Run the generator ad hoc against explicit inputs (files or dirs of `*.po`):

```sh
npx tsx src/cli.ts path/to/he.po some/dir --out generated --test
# --base <dir> overrides repos.json's base; --package sets the Go package name
```

Verifying generated Go directly:

```sh
cd <outdir> && GOTOOLCHAIN=local go test ./...
```

## Architecture

Pipeline, one module per stage (`src/`):

1. **`cli.ts`** — arg/`repos.json` handling; gathers `.po` paths, runs the
   pipeline, writes files, runs `gofmt -w` (best-effort), and on `--test` emits
   a `go.mod`.
2. **`poReader.ts`** — parses with `gettext-parser` and **merges per locale**.
   The same locale (e.g. `he`, `ashkenazi`) lives in multiple repos; entries are
   merged with later files overriding earlier. Drops: empty msgid/msgstr,
   identity translations (`msgstr == msgid`), and **any msgid containing `%`**.
3. **`localeMap.ts`** — the locale-name ⇄ BCP-47 tag mapping and `AllLocales`
   ordering. **Single source of truth**, emitted verbatim into `catalog.go`.
4. **`nikud.ts`** — `stripNikud`, a faithful port of hebcal-go's
   `HebrewStripNikkud` (rune range U+0590–U+05C7, sparing only U+05BE MAQAF).
5. **`goEmit.ts`** — generates `catalog.go`, `nikud.go` (the public
   `HebrewStripNikud` helper), per-locale `strings_*.go`, and an optional
   self-checking `catalog_generated_test.go`.

## Non-obvious invariants (don't break these)

- **Locale → tag mapping.** `golang.org/x/text/language` is strict BCP-47.
  `he-x-NoNikud` is valid (normalises to `he-x-nonikud`). The `ashkenazi*` names
  are **not** — `ashkenazi` is 9 chars, over the 8-char private-use subtag limit,
  so it must be mapped to a hand-picked private-use tag (`he-x-ashkenaz`,
  `he-x-ashk-litvish`, …), each subtag ≤ 8 chars. If you add an Ashkenazi
  variant, add it to `LOCALES` with a tag whose subtags fit.
- **`he-x-NoNikud` is baked**, not stripped at runtime: built from the full `he`
  dict with `stripNikud` applied, then explicit `he-x-NoNikud.po` overrides on
  top. Keep `nikud.ts` byte-identical in behaviour to the Go original. The same
  transform is also emitted to Go as the exported `HebrewStripNikud` in
  `nikud.go` (twin of `nikud.ts`); keep all three in lockstep.
- **`ok` bool relies on dropping identity translations.** Because the catalogue
  never stores `msgstr == msgid`, the generated `LookupTranslation` treats
  `Sprintf(key) == key` as "not found". Don't stop dropping identity entries
  without also rethinking the lookup.
- **`%`-bearing msgids are intentionally dropped** (Hebcal doesn't use them) so
  every entry is safe for `message.Printer.Sprintf`. Re-introducing them means
  handling format verbs in lookup.
- **Pass-through locales** `en`, `sephardic`, `""` carry no dictionary and return
  the key with `ok == true`.

## Go version constraint

Generated code uses only long-stable `x/text` APIs (no generics), so the Go
floor is set by `x/text` itself: `v0.21.0` (and older) need go 1.18; `v0.23.0+`
need 1.23–1.25. hebcal-go is on go 1.17 with no `x/text` dep, so the emitted
`go.mod` pins `x/text v0.21.0` / `go 1.18` to keep that bump minimal. Verify with
`GOTOOLCHAIN=local` to avoid the toolchain auto-upgrading.

## Reference (upstream, not in this repo)

- Old generator: `hebcal/hebcal-locales` → `po2golang.js`
- Target lookup + niqqud source: `hebcal/hebcal-go` → `locales/locales.go`, `locales/nikud.go`
- `.po` sources: `hdate-js`, `hebcal-es6`, `hebcal-locales`, `hebcal-leyning`, `hebcal-learning` (each under `po/`)
