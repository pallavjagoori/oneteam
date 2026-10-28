# Chatwoot code that no test can reach

Step 1.4 aims for 100% coverage of Chatwoot's code. A few lines and branches can't run with any input, because
other code rules out the case before it gets there. They are listed here instead of being tested, and they don't
need porting: the Laravel/Vue version can leave them out.

| File | Lines | Why it can't run |
| --- | --- | --- |
| `app/javascript/dashboard/helper/slaHelper.js` | 180 (false branch), 181 | The sort only sees a `null` threshold when the SLA is completed without a completion time. Then every status has a `null` threshold, so a `null` is never compared with a number. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 26 (true branch) | `startOfWeek` is called without options, so weeks start on Sunday and the date is never a Monday. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 93 (true branch) | `expandUnit` is only called with `h`, `m` or a unit already found in `UNIT_MAP`. |
| `app/javascript/dashboard/helper/snoozeHelpers.js` | 149 (`\|\| match`) | The regex only matches units that are all keys of `UNIT_SHORT`. |
| `app/javascript/dashboard/helper/auditlogHelper.js` | 105 (false branch) | `extractChangedAccountUserValues` always returns an object. |
| `app/javascript/dashboard/helper/emailQuoteExtractor.js` | 134 | Every text node sits inside the extractor's own wrapper `<div>`, so a block parent is always found. |
| `app/javascript/dashboard/helper/quotedEmailHelper.js` | 240–241, 272–273 | `getEmailDate` only returns valid dates, and `formatQuotedEmailDate` only returns `''` for invalid ones. |
| `app/javascript/dashboard/helper/editorHelper.js` | 394 (true branch) | ProseMirror's `create` always returns a node, so `imageNode` is never empty. |
| `app/javascript/dashboard/helper/editorHelper.js` | 563 (default case) | `createNode` is only called by `nodeCreators`, each with its own known type. |
| `app/javascript/dashboard/helper/snoozeDateParser/localization.js` | 233 (`\|\| {}`) | Every section name comes from `CACHE_SECTIONS`, and each has an English default. |
| `app/javascript/dashboard/helper/snoozeDateParser/localization.js` | 266 (`locale \|\| ''`) | The cache is only used when a locale other than `en` is set. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 205, 231–232 (null checks in durations) | The number and unit patterns are built from `WORD_NUMBER_MAP` and `UNIT_MAP`, so every match parses. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 213, 496, 515 (missing map entries) | The regexes only match names that have an entry in `HALF_UNIT_DURATIONS`, `TOD_HOUR_RANGE` and `TIME_OF_DAY_MAP`. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 353, 389, 399, 409, 430, 440, 457 (`!fn`) | Weekday indexes come from `WEEKDAY_MAP`, and `NEXT_WEEKDAY_FN` has all seven. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 582, 617 (`!isValid`) | `new Date(year, month, day)` with these numbers is always a valid date. |
| `app/javascript/dashboard/helper/snoozeDateParser/parser.js` | 693, 707, 722 (fall-through) | Each regex only captures the units the `if` chain already handles. |
