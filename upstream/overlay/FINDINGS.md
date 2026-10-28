# Chatwoot bugs and quirks found while writing tests

Writing tests for every line of Chatwoot turns up behaviour that looks wrong. The tests pin Chatwoot's behaviour as
it is (so the reference stays honest), and each case is listed here so the Laravel/Vue port can decide on purpose
whether to copy it or fix it. Each entry names the test that pins it.

| Where | What happens | Effect today | Pinned by |
| --- | --- | --- | --- |
| `dashboard/helper/actionQueryGenerator.js` | An automation action with `action_params: null` throws, because `typeof null` is `'object'`, so it takes the object branch. | Low: the UI sends `undefined` or a value, not `null`. | `helper/specs/moreHelpers.oneteam.spec.js` |
| `dashboard/helper/emailQuoteExtractor.js` | Quote-like text that is not inside a block element ("On … wrote:" in a bare `<span>`) makes `hasQuotes` say yes, but `extractQuotes` doesn't remove it, because the "block" found is the extractor's own wrapper. | Low: the "show quoted text" toggle can appear with nothing to hide. | `helper/specs/emailQuoteExtractor.oneteam.spec.js` |
| `dashboard/helper/AudioAlerts/DashboardAudioNotificationHelper.js` | `set()` without `audioAlertType` throws, because the default is an array but the code calls `.split` on it. | None today: every caller passes a string. | `helper/AudioAlerts/specs/DashboardAudioNotificationHelper.oneteam.spec.js` |
