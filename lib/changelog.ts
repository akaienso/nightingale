// Central changelog + app version.
//
// HOW TO ADD A RELEASE (going forward):
//  1. Bump APP_VERSION using semantic versioning:
//       - patch (1.6.0 -> 1.6.1) for bug fixes
//       - minor (1.6.0 -> 1.7.0) for new features
//       - major (1.6.0 -> 2.0.0) for large / breaking changes
//  2. Prepend a new entry to the top of CHANGELOG (newest first).
//  3. Provide both English (en) and Ukrainian (uk) text for every item.
//
// NOTE: The dates on the earlier (backfilled) releases are approximate
// reconstructions of when each feature shipped and can be adjusted freely.

export const APP_VERSION = '1.8.0';

export type ChangeType = 'new' | 'improved' | 'fixed';

export interface ChangeItem {
  type: ChangeType;
  en: string;
  uk: string;
}

export interface Release {
  version: string;
  /** ISO date (yyyy-mm-dd). Approximate for backfilled releases. */
  date: string;
  items: ChangeItem[];
}

// Newest first.
export const CHANGELOG: Release[] = [
  {
    version: '1.8.0',
    date: '2026-07-20',
    items: [
      {
        type: 'new',
        en: 'A new Paste button appears in the source panel when it is empty, so you can drop in text from your clipboard with a single tap.',
        uk: 'Нова кнопка «Вставити» з’являється в панелі джерела, коли вона порожня, тож ви можете додати текст із буфера обміну одним дотиком.',
      },
      {
        type: 'new',
        en: 'Quick controls now sit pinned at the bottom of the translation view: switch the output Style and Format on the fly, toggle emojis, and re-translate instantly — with a handy “set as default” switch for each.',
        uk: 'Швидкі елементи керування тепер закріплені внизу вікна перекладу: миттєво змінюйте стиль і формат виводу, вмикайте емодзі та перекладайте заново — з зручним перемикачем «за замовчуванням» для кожного.',
      },
      {
        type: 'new',
        en: 'New Output Format setting tailors translations for how you will use them — spoken, email, text message, social media, or general.',
        uk: 'Нове налаштування «Формат виводу» адаптує переклади під те, як ви їх використаєте — усне мовлення, лист, повідомлення, соцмережі або загальний.',
      },
      {
        type: 'new',
        en: 'Optional emojis can now be woven into your translations, chosen to fit the tone and context of each message.',
        uk: 'Тепер до перекладів можна додавати емодзі, підібрані під тон і контекст кожного повідомлення.',
      },
      {
        type: 'new',
        en: 'You can now choose how the Enter key behaves — send, or add a new line — separately for the translation and chat views.',
        uk: 'Тепер ви можете обрати, як діє клавіша Enter — надіслати чи додати новий рядок — окремо для перекладу та чату.',
      },
      {
        type: 'new',
        en: 'Your name in the header now shows your preferred nickname and opens your profile in one click, where you can manage your email, sign-in method, connect or disconnect Google, and set a password.',
        uk: 'Ваше ім’я у заголовку тепер показує обраний псевдонім і відкриває профіль одним кліком, де ви можете керувати поштою, способом входу, підключати чи від’єднувати Google та встановлювати пароль.',
      },
      {
        type: 'improved',
        en: 'The former “Output Format” setting is now clearly labelled “Output Style” to sit alongside the new format options.',
        uk: 'Колишнє налаштування «Формат виводу» тепер має чітку назву «Стиль виводу», щоб поєднуватися з новими параметрами формату.',
      },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-07-20',
    items: [
      {
        type: 'improved',
        en: 'Settings now has its own button in the mobile header — right between the theme switcher and the menu — so it is always just one tap away on every screen.',
        uk: 'Налаштування тепер мають окрему кнопку в мобільному заголовку — між перемикачем теми та меню — тож вони завжди за один дотик на будь-якому екрані.',
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-07-14',
    items: [
      {
        type: 'new',
        en: 'A one-tap Clear button now empties the source panel, and a Copy button copies your source text to the clipboard.',
        uk: 'Кнопка «Очистити» тепер миттєво звільняє панель джерела, а кнопка «Копіювати» копіює ваш вихідний текст у буфер обміну.',
      },
      {
        type: 'improved',
        en: 'Swapping languages now keeps your text in place, and clearing empties both panels at once for a cleaner start.',
        uk: 'Перемикання мов тепер зберігає ваш текст на місці, а очищення звільняє обидві панелі одночасно для чистого початку.',
      },
      {
        type: 'improved',
        en: 'Added behind-the-scenes safeguards that keep the service fast and reliable during heavy usage.',
        uk: 'Додано приховані запобіжники, які підтримують швидку та надійну роботу сервісу під час високого навантаження.',
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-14',
    items: [
      {
        type: 'new',
        en: 'Your translation preferences now save automatically and follow your account across devices and browsers when you are signed in.',
        uk: 'Ваші налаштування перекладу тепер зберігаються автоматично та переходять разом з обліковим записом на всіх пристроях і в різних браузерах, коли ви увійшли.',
      },
      {
        type: 'new',
        en: 'A quick confirmation now appears each time a preference is saved, so you always know your changes were kept.',
        uk: 'Тепер щоразу після збереження налаштування зʼявляється коротке підтвердження, тож ви завжди бачите, що зміни збережено.',
      },
      {
        type: 'improved',
        en: 'The translate button now stays visible at the bottom of the source panel even while scrolling through long text.',
        uk: 'Кнопка перекладу тепер залишається видимою внизу панелі джерела навіть під час прокручування довгого тексту.',
      },
      {
        type: 'improved',
        en: 'The chat message box now grows as you type so you can see your whole message before sending.',
        uk: 'Поле повідомлення в чаті тепер збільшується під час набору, тож ви бачите все повідомлення перед надсиланням.',
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-06-05',
    items: [
      {
        type: 'new',
        en: 'Choose your English variety — American, British, Australian, Canadian, or International — and Olia adapts spelling, vocabulary, and idioms to match.',
        uk: 'Оберіть свій варіант англійської — американську, британську, австралійську, канадську чи міжнародну — і Olia адаптує правопис, лексику та ідіоми відповідно.',
      },
      {
        type: 'improved',
        en: 'Your history now records which English variety each translation used and shows the matching flag.',
        uk: 'Ваша історія тепер запамʼятовує, який варіант англійської використано для кожного перекладу, і показує відповідний прапор.',
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-18',
    items: [
      {
        type: 'new',
        en: 'Added a guided tour and a Help center to make it easy to learn every feature.',
        uk: 'Додано інтерактивний тур і Довідковий центр, щоб було легко освоїти всі функції.',
      },
      {
        type: 'new',
        en: 'Added bot protection on sign-in and sign-up to keep accounts safe.',
        uk: 'Додано захист від ботів під час входу та реєстрації для безпеки облікових записів.',
      },
      {
        type: 'improved',
        en: 'Added a Terms of Service page alongside the Privacy Policy.',
        uk: 'Додано сторінку Умов використання поруч з Політикою конфіденційності.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-03-10',
    items: [
      {
        type: 'new',
        en: 'Nightingale can now be installed as an app and works offline.',
        uk: 'Nightingale тепер можна встановити як застосунок, і він працює офлайн.',
      },
      {
        type: 'improved',
        en: 'The welcome screen loads much faster thanks to optimized media.',
        uk: 'Вітальний екран завантажується значно швидше завдяки оптимізованим медіа.',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-02-12',
    items: [
      {
        type: 'new',
        en: 'Added image and document translation — upload a photo or file and get the text translated with cultural notes.',
        uk: 'Додано переклад зображень і документів — завантажте фото чи файл і отримайте переклад тексту з культурними примітками.',
      },
      {
        type: 'new',
        en: 'Added voice input and spoken playback for translations.',
        uk: 'Додано голосове введення та озвучування перекладів.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-01-15',
    items: [
      {
        type: 'new',
        en: 'Meet Olia — chat with your AI language guide and use Live Conversation mode for real-time, two-way speech translation.',
        uk: 'Знайомтеся з Olia — спілкуйтеся зі своїм AI-помічником з мови та користуйтеся режимом живої розмови для двостороннього перекладу мовлення в реальному часі.',
      },
      {
        type: 'improved',
        en: 'Refreshed the app with the Nightingale name and visual identity.',
        uk: 'Оновлено застосунок з назвою та візуальним стилем Nightingale.',
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-11-20',
    items: [
      {
        type: 'new',
        en: 'Initial release: side-by-side Ukrainian ↔ English translation with cultural context, dialect and tone options, accounts, and saved history.',
        uk: 'Перший випуск: паралельний переклад українською ↔ англійською з культурним контекстом, вибором діалекту й тону, обліковими записами та збереженою історією.',
      },
    ],
  },
];
