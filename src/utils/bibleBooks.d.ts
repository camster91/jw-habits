/**
 * Shared Bible book mappings
 *
 * Two versions are provided to suit different lookup needs:
 * - BIBLE_BOOKS_LOWER: lowercase keys (includes "psalm"/"psalms" alias)
 * - BIBLE_BOOKS_TITLE: title-case keys matching JW reading schedule book names
 *
 * Both map book names to their canonical number 1-66.
 */
/** Lowercase book-name map (includes psalm/psalms alias for flexible lookup) */
export declare const BIBLE_BOOKS_LOWER: Record<string, number>;
/** Title-case book-name map matching JW reading schedule entries */
export declare const BIBLE_BOOKS_TITLE: Record<string, number>;
//# sourceMappingURL=bibleBooks.d.ts.map