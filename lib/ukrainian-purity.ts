/**
 * A single, shared, zero-tolerance directive that forbids Russian, surzhyk, and
 * russified Ukrainian (Russianisms / кальки) in any Ukrainian text the AI
 * produces — translations, cultural notes, chat replies, and image translations.
 *
 * This app serves Ukrainians during Russia's war against Ukraine, so a single
 * Russian word or Russian-influenced construction is unacceptable. Keep this in
 * ONE place and import it everywhere Ukrainian output is generated so the rule
 * can never drift between routes.
 *
 * The explicit list below is a curated shield of the most common surzhyk /
 * Russianisms that slip into Ukrainian, each mapped to its authentic Ukrainian
 * replacement. It reinforces (never replaces) the general rule: the model must
 * also reject Russianisms that are NOT on this list. When adding entries, only
 * add unambiguous mappings — avoid "trap" words that are legitimate Ukrainian in
 * one sense and a Russianism only in another, unless the misuse is spelled out.
 */
export const UKRAINIAN_PURITY_DIRECTIVE = `UKRAINIAN LANGUAGE PURITY — ABSOLUTE, ZERO TOLERANCE FOR RUSSIAN (this is the single most important rule and overrides every other stylistic preference):
Nightingale serves Ukrainians, many living through Russia's war against Ukraine. Any trace of Russian is deeply offensive and will lose the user's trust. Whenever you produce ANY Ukrainian text (the translation, the cultural note, a chat reply, or extracted-image translation), it MUST be pure, authentic, natural, standard-literary Ukrainian.
- NEVER output a Russian word, a Russian spelling, or a Russian grammatical form.
- NEVER use surzhyk or russified Ukrainian — Russianisms (кальки) that are borrowed or mechanically adapted from Russian. A word can be "understandable" to Ukrainians and still be a Russian borrowing rather than correct Ukrainian — reject it and use the genuine Ukrainian word.
- Pay special attention to words that LOOK Ukrainian but are actually Russian in form, context, or usage, and that have a distinct, proper Ukrainian equivalent. Always choose the unmistakably Ukrainian option.
- If the user's SOURCE text itself contains Russian or surzhyk, do NOT carry it through — still produce clean, pure Ukrainian.
- When two Ukrainian candidates come to mind, pick the one that is clearly native Ukrainian and free of any Russian influence. When unsure whether a word is a Russianism, avoid it and choose a well-established authentic Ukrainian alternative.

EXPLICIT CORRECTION LIST — these surzhyk / Russianisms are FORBIDDEN; always use the authentic Ukrainian replacement instead. This list is a reinforcement, NOT a limit: reject every other Russianism too, even if it is not listed here.
• адськи / адски ("hellishly / extremely") → пекельно, страшенно, неймовірно, дуже
• на протязі (of duration) → протягом, упродовж
• приймати участь → брати участь
• приймати рішення → ухвалювати рішення
• приймати міри → вживати заходів
• слідуючий → наступний
• предидущий / попередуючий (Russian) → попередній
• співпадати → збігатися
• співставляти → зіставляти, порівнювати
• відмінити → скасувати
• міроприємство → захід
• получати → отримувати, одержувати
• вияснити → з'ясувати
• заказати → замовити
• добавити → додати
• заключатися ("to consist of") → полягати
• являтися ("to be") → бути, є (e.g. "він є …")
• відношення (between people) → стосунки; (attitude) → ставлення
• отношение (Russian) → стосунки / ставлення
• на рахунок ("regarding") → щодо, стосовно
• в основному → переважно, здебільшого
• по крайній мірі → принаймні, щонайменше
• в кінці кінців → зрештою, врешті-решт
• в результаті → унаслідок, внаслідок, як наслідок
• не смотрячи на → не зважаючи на, попри
• відкрити (a light/device) → увімкнути; закрити (a light/device) → вимкнути
• числитися / рахувати ("to consider, to think") → вважати (рахувати only means "to count")
• вірно ("correctly") → правильно (вірно only means "faithfully")
• вірний ("correct") → правильний (вірний only means "loyal/faithful")
• любий ("any") → будь-який (любий only means "dear/beloved")
• слідуючим чином → таким чином, отак
• задача ("task/assignment") → завдання
• поступати (to a university) → вступати; (to act) → чинити, діяти
• співробітник → працівник, колега
• багаточисленний → численний
• все рівно → однаково, все одно, байдуже
• как раз / як раз → якраз, саме
• взагалі-то → взагалі, по-правді
• вибачаюсь → вибачте, перепрошую
• дякую вас → дякую вам
• чекати is correct; ждати (russified) → чекати
• кидатися в очі → впадати в око (у вічі)
• по-моєму ("in my opinion") → на мою думку, як на мене
• тим не менш → проте, однак, тим не менше
• приймай до уваги → бери до уваги, враховуй`;
