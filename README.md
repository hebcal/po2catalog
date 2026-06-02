# @hebcal/po2catalog

Generate Go [`golang.org/x/text/message/catalog`](https://pkg.go.dev/golang.org/x/text/message/catalog)
source from Hebcal's gettext `.po` files.

This is the successor to [`po2golang.js`](https://github.com/hebcal/hebcal-locales/blob/main/po2golang.js).
Instead of emitting static `map[string]string` tables plus a hand-rolled
`LookupTranslation`, it populates an official `catalog.Builder` and drives
lookups through a `message.Printer`, while preserving the existing
`LookupTranslation(key, locale) (string, bool)` contract.

## Usage

```sh
npm install

# Scan the repos listed in repos.json (expects sibling checkouts under ../)
npm run generate -- --out generated

# Or point at explicit .po files / directories
npx tsx src/cli.ts path/to/he.po path/to/es.po --out generated

# Generate + self-checking Go test, then run it
npm run verify
```

The generated package (default `package locales`) is written to the output
directory and formatted with `gofmt` if it is on `PATH`. With `--test`, a
`go.mod` and a `catalog_generated_test.go` are also emitted so the output
builds and round-trips standalone.

### Input repos

`.po` files are gathered from five repos (configurable in `repos.json`):
`hdate-js`, `hebcal-es6`, `hebcal-locales`, `hebcal-leyning`, `hebcal-learning`.
The same locale (e.g. `he`, `ashkenazi`) appears in several repos; all files
for a locale are **merged**, with later files overriding earlier duplicates.

## How locales map to BCP-47 tags

`golang.org/x/text/language` is strict BCP-47, so Hebcal's non-standard locale
names need care. The mapping lives in `src/localeMap.ts` and is emitted verbatim
into the generated `catalog.go` (and is intended to be shared with hebcal-go).

| Hebcal locale        | Catalogue tag         | Why |
| -------------------- | --------------------- | --- |
| `he`, `es`, `fr`, …  | unchanged             | already valid BCP-47 |
| `he-x-NoNikud`       | `he-x-nonikud`        | valid BCP-47 private use (just lowercased) |
| `ashkenazi`          | `he-x-ashkenaz`       | `ashkenazi` is 9 chars > the 8-char private-use subtag limit, so it cannot be parsed directly |
| `ashkenazi_litvish`  | `he-x-ashk-litvish`   | hand-picked private-use subtags, each ≤ 8 chars |
| `ashkenazi_komatz`   | `he-x-ashk-komatz`    | |
| `ashkenazi_poylish`  | `he-x-ashk-poylish`   | |
| `ashkenazi_romanian` | `he-x-ashk-romanian`  | |
| `ashkenazi_standard` | `he-x-ashk-standard`  | |

These private-use tags parse cleanly and stay distinct from `he` (no accidental
fallback), matching the current behaviour where each Ashkenazi locale is an
independent dictionary.

## Notable behaviours

- **`he-x-NoNikud` is baked.** Its dictionary is built by stripping niqqud from
  every `he` entry (via a faithful port of hebcal-go's `HebrewStripNikkud`,
  see `src/nikud.ts`), then layering the explicit `he-x-NoNikud.po` overrides on
  top. No runtime niqqud stripping is needed.
- **`%`-bearing msgids are dropped.** Hebcal does not use these format strings
  in practice, and dropping them keeps every catalogue entry safe to retrieve
  through `message.Printer.Sprintf` without format-verb surprises.
- **Identity translations are dropped** (`msgstr == msgid`), as in `po2golang.js`.
  Because of this, `Sprintf(key) == key` reliably means "not found", which is how
  the generated `LookupTranslation` reconstructs the `ok bool`.
- **`en`, `sephardic`, `""`** are pass-through locales: lookup returns the key
  with `ok == true` and they carry no dictionary.

## Go / x/text versions

The generated code uses only long-stable `x/text` APIs (`catalog.NewBuilder`,
`Builder.SetString`, `message.NewPrinter`) and no generics, so it is not the
limiting factor. The Go floor comes from `golang.org/x/text` itself:

| x/text       | requires Go |
| ------------ | ----------- |
| ≤ `v0.21.0`  | 1.18        |
| `v0.23.0`    | 1.23        |
| `v0.30.0`    | 1.24        |
| `v0.37.0`    | 1.25        |

hebcal-go currently targets **go 1.17** with no `x/text` dependency. Adopting
the catalogue adds `x/text`; pinning **`v0.21.0`** keeps the bump minimal
(1.17 → 1.18). The emitted standalone `go.mod` reflects this.

## Layout

```
src/
  cli.ts        entrypoint / arg + config handling
  poReader.ts   parse + merge .po files (gettext-parser)
  localeMap.ts  locale name <-> BCP-47 tag mapping; AllLocales order
  nikud.ts      HebrewStripNikkud port
  goEmit.ts     Go code generation (catalog.go, strings_*.go, _test.go)
test/           unit tests (niqqud, Go quoting)
repos.json      which repos/po dirs to scan
```
