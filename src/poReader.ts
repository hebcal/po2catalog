import fs from 'node:fs';
import path from 'node:path';
import {po} from 'gettext-parser';

/** A single locale's merged translation dictionary: msgid -> msgstr. */
export type Dict = Map<string, string>;

/** All locales discovered, keyed by canonical locale name. */
export type Catalog = Map<string, Dict>;

export interface ReadOptions {
  /** Called with non-fatal problems (missing headers, etc.). */
  warn?: (msg: string) => void;
}

/** Derive the Hebcal locale name from a .po path: "po/he-x-NoNikud.po" -> "he-x-NoNikud". */
export function localeNameFromPath(poPath: string): string {
  return path.basename(poPath).replace(/\.po$/, '');
}

/**
 * Parse and merge a set of .po files into per-locale dictionaries.
 *
 * Multiple files may map to the same locale (e.g. `he.po` exists in five
 * repos); their entries are merged, with later files overriding earlier ones
 * for duplicate msgids. Entries are dropped when:
 *   - the msgid is empty (the header pseudo-entry), or
 *   - the msgstr is empty, or
 *   - the translation equals the source (no-op), or
 *   - the msgid contains '%' (Hebcal does not use these format strings, and
 *     dropping them keeps the catalogue safe for message.Printer retrieval).
 */
export function readPoFiles(poPaths: string[], opts: ReadOptions = {}): Catalog {
  const warn = opts.warn ?? (() => {});
  const catalog: Catalog = new Map();

  for (const poPath of poPaths) {
    const name = localeNameFromPath(poPath);
    const contents = fs.readFileSync(poPath).toString().normalize();
    const parsed = po.parse(contents);

    const headers = parsed.headers ?? {};
    const language = headers['Language'] ?? headers['language'];
    const plural = headers['Plural-Forms'] ?? headers['plural-forms'];
    if (!language) warn(`${poPath}: missing "Language" header`);
    if (!plural) warn(`${poPath}: missing "Plural-Forms" header`);

    let dict = catalog.get(name);
    if (!dict) {
      dict = new Map();
      catalog.set(name, dict);
    }

    const context = parsed.translations[''] ?? {};
    for (const entry of Object.values(context)) {
      const msgid = entry.msgid;
      const msgstr = entry.msgstr?.[0];
      if (!msgid || !msgstr) continue;
      if (msgid.includes('%')) continue;
      if (msgstr === msgid) continue;
      dict.set(msgid, msgstr);
    }
  }

  return catalog;
}
