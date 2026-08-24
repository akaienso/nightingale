// Central changelog + app version.
//
// HOW TO ADD A RELEASE (going forward):
//  1. Bump APP_VERSION using semantic versioning:
//       - patch (1.6.0 -> 1.6.1) for bug fixes
//       - minor (1.6.0 -> 1.7.0) for new features
//       - major (1.6.0 -> 2.0.0) for large / breaking changes
//  2. Prepend a new entry to the top of CHANGELOG (newest first).
//  3. Provide English (en), Ukrainian (uk), and Spanish (es) text for every item.
//
// NOTE: The dates on the earlier (backfilled) releases are approximate
// reconstructions of when each feature shipped and can be adjusted freely.

export const APP_VERSION = '1.13.3'; // x-release-please-version

/**
 * MANUAL "What's New" OVERRIDE.
 *
 * Normally the What's New modal only fires on a feature release (a minor or
 * major bump — see isNewerFeatureRelease). Set this to force the modal to
 * appear on a flagged release (e.g. a patch that re-announces something we
 * forgot to surface) AND to pin exactly which version's features the modal
 * reports.
 *
 *   force         - when true, the modal is shown to anyone who hasn't yet
 *                   dismissed THIS flagged announcement, regardless of the
 *                   normal feature-release check.
 *   featureVersion - the version label the modal reports (shown in the
 *                    "What's New in vX.Y.Z" link and used to track dismissal).
 *
 * Set to null to return to the default feature-release-only behavior.
 */
export const WHATS_NEW_OVERRIDE: { force: boolean; featureVersion: string } | null = {
  force: true,
  featureVersion: '1.13.3',
};

/** The "feature" portion of a version string, i.e. major.minor (ignores patch). */
export function featureKey(version: string): string {
  const parts = (version || '').split('.');
  const major = parseInt(parts[0] ?? '0', 10) || 0;
  const minor = parseInt(parts[1] ?? '0', 10) || 0;
  return `${major}.${minor}`;
}

/**
 * True when `current` is a newer FEATURE release than `seen` — i.e. the
 * major or minor number increased. Patch-only bumps (1.11.0 -> 1.11.1) return
 * false so the "What's New" modal never fires on small fixes.
 */
export function isNewerFeatureRelease(current: string, seen: string): boolean {
  const [cMaj, cMin] = featureKey(current).split('.').map((n) => parseInt(n, 10) || 0);
  const [sMaj, sMin] = featureKey(seen).split('.').map((n) => parseInt(n, 10) || 0);
  if (cMaj !== sMaj) return cMaj > sMaj;
  return cMin > sMin;
}

export type ChangeType = 'new' | 'improved' | 'fixed';

export interface ChangeItem {
  type: ChangeType;
  en: string;
  uk: string;
  es?: string;
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
    version: '1.13.4',
    date: '2026-08-23',
    items: [
      {
        type: 'new',
        en: 'Tap any saved translation in your history to open it back up in the translator, ready to edit or re-translate.',
        uk: 'Торкніться будь-якого збереженого перекладу в історії — і він знову відкриється в перекладачі, готовий до редагування.',
        es: 'Toca cualquier traducción guardada en tu historial para volver a abrirla en el traductor, lista para editar.',
      },
      {
        type: 'improved',
        en: 'History entries now expand so you can read the whole thing, and the copy buttons copy the full text instead of the shortened preview.',
        uk: 'Записи в історії тепер розгортаються, щоб прочитати їх повністю, а кнопки копіювання копіюють увесь текст, а не скорочений уривок.',
        es: 'Las entradas del historial ahora se expanden para leerlas completas, y los botones de copiar copian el texto entero en vez del resumen.',
      },
      {
        type: 'improved',
        en: 'Deleting a single translation now offers an undo, so a mis-tap is no longer permanent.',
        uk: 'Видалення окремого перекладу тепер можна скасувати, тож випадковий дотик уже не є остаточним.',
        es: 'Al eliminar una traducción ahora puedes deshacerlo, así que un toque accidental ya no es definitivo.',
      },
    ],
  },
  {
    version: '1.13.3',
    date: '2026-08-10',
    items: [
      {
        type: 'improved',
        en: 'Improvement to output quality and cultural awareness of translation engine.',
        uk: 'Покращення якості перекладу та культурної точності рушія перекладу.',
        es: 'Mejora en la calidad de salida y la conciencia cultural del motor de traducción.',
      },
    ],
  },
  {
    version: '1.13.2',
    date: '2026-08-09',
    items: [
      {
        type: 'improved',
        en: 'New jump controls in Chat let you skip to the top or bottom of a conversation and step between messages.',
        uk: 'Нові елементи навігації в чаті дають змогу переходити до початку чи кінця розмови та рухатися між повідомленнями.',
        es: 'Los nuevos controles de salto en el Chat te permiten ir al inicio o al final de una conversación y moverte entre mensajes.',
      },
      {
        type: 'improved',
        en: 'On phones, a new skip button jumps you straight to the translation.',
        uk: 'На телефонах нова кнопка одразу переносить вас до перекладу.',
        es: 'En teléfonos, un nuevo botón te lleva directamente a la traducción.',
      },
      {
        type: 'fixed',
        en: 'On phones, the Translate button now spans the full width of the source box, making it easier to reach with either thumb.',
        uk: 'На телефонах кнопка «Перекласти» тепер займає всю ширину поля вводу, тож її легше натиснути будь-яким великим пальцем.',
        es: 'En teléfonos, el botón «Traducir» ahora ocupa todo el ancho del cuadro de origen, para que sea más fácil de alcanzar con cualquier pulgar.',
      },
      {
        type: 'fixed',
        en: 'Evened out the padding around the Translate button on tablet and desktop.',
        uk: 'Вирівняно відступи навколо кнопки «Перекласти» на планшетах і компʼютерах.',
        es: 'Se emparejó el relleno alrededor del botón «Traducir» en tablet y escritorio.',
      },
    ],
  },
  {
    version: '1.13.1',
    date: '2026-08-09',
    items: [
      {
        type: 'fixed',
        en: 'Minor bug fixes and improvements.',
        uk: 'Незначні виправлення та покращення.',
        es: 'Correcciones de errores menores y mejoras.',
      },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-08-08',
    items: [
      {
        type: 'new',
        en: 'Share a translation with one tap — a new Share button in the translation pane opens your device’s share sheet, or copies the text if sharing isn’t available.',
        uk: 'Поділіться перекладом одним дотиком — нова кнопка «Поділитися» у панелі перекладу відкриває системне меню обміну або копіює текст, якщо обмін недоступний.',
        es: 'Comparte una traducción con un toque — un nuevo botón Compartir en el panel de traducción abre el menú de compartir de tu dispositivo, o copia el texto si compartir no está disponible.',
      },
      {
        type: 'improved',
        en: 'The Translate tab is redesigned for phones — each box now has a clean icon toolbar underneath, and the source and translation panes split the screen evenly.',
        uk: 'Вкладка «Переклад» оновлена для телефонів — під кожним полем тепер є акуратна панель значків, а панелі вводу та перекладу порівну ділять екран.',
        es: 'La pestaña Traducir se rediseñó para teléfonos — cada cuadro ahora tiene una barra de iconos debajo, y los paneles de origen y traducción dividen la pantalla por igual.',
      },
      {
        type: 'improved',
        en: 'Style, format, and emoji options now live behind a single “Style & format” button in the source pane. Tap it to open a compact popover — replacing the old settings bar along the bottom.',
        uk: 'Параметри стилю, формату та емодзі тепер зібрані під однією кнопкою «Стиль і формат» у панелі вводу. Натисніть її, щоб відкрити компактне вікно — замість колишньої панелі налаштувань унизу.',
        es: 'Las opciones de estilo, formato y emojis ahora están detrás de un solo botón «Estilo y formato» en el panel de origen. Tócalo para abrir una ventana compacta — en lugar de la antigua barra de ajustes de abajo.',
      },
      {
        type: 'fixed',
        en: 'Fixed spacing on the Translate tab — the paste shortcut no longer overlaps the placeholder text, and the AI notice now sits flush above the footer.',
        uk: 'Виправлено відступи на вкладці «Переклад» — кнопка вставляння більше не накладається на текст-підказку, а повідомлення про ШІ тепер розташоване впритул над нижнім колонтитулом.',
        es: 'Corregido el espaciado en la pestaña Traducir — el atajo de pegar ya no se superpone al texto de marcador de posición, y el aviso de IA ahora queda justo encima del pie de página.',
      },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-08-02',
    items: [
      {
        type: 'new',
        en: 'New "What\'s New" pop-up: after a feature update, returning users get a quick guided tour of the latest additions — starting with Verify Translation and the ability to choose your verification service.',
        uk: 'Нове вікно «Що нового»: після оновлення з новими функціями користувачі, які повертаються, отримують короткий огляд новинок — починаючи з перевірки перекладу та можливості обрати сервіс перевірки.',
        es: 'Nueva ventana «Novedades»: tras una actualización con nuevas funciones, los usuarios que regresan reciben un breve recorrido guiado por las últimas incorporaciones — empezando por Verificar traducción y la posibilidad de elegir tu servicio de verificación.',
      },
      {
        type: 'improved',
        en: 'The translation verification service now defaults to DeepL for anyone who hasn\'t picked their own provider. If you\'ve already chosen a provider in Settings, your choice is kept.',
        uk: 'Сервіс перевірки перекладу тепер за замовчуванням використовує DeepL для всіх, хто ще не обрав власний сервіс. Якщо ви вже обрали сервіс у налаштуваннях, ваш вибір зберігається.',
        es: 'El servicio de verificación de traducciones ahora usa DeepL de forma predeterminada para quienes no han elegido su propio servicio. Si ya elegiste uno en los ajustes, se mantiene tu elección.',
      },
    ],
  },
  {
    version: '1.11.1',
    date: '2026-08-02',
    items: [
      {
        type: 'fixed',
        en: 'Fixed the "Verify Translation" button hover state — text now turns dark on hover instead of staying green-on-gold, which was hard to read.',
        uk: 'Виправлено стан наведення кнопки «Перевірити переклад» — текст тепер стає темним при наведенні замість зеленого на золотому, який було важко прочитати.',
        es: 'Corregido el estado hover del botón «Verificar traducción» — el texto ahora se oscurece al pasar el cursor en lugar de quedarse verde sobre dorado, que era difícil de leer.',
      },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-08-02',
    items: [
      {
        type: 'new',
        en: 'A first-visit toast now suggests installing Nightingale as an app on your device, with a one-tap guide for Windows, Mac, Android, and iOS.',
        uk: 'При першому візиті тепер з’являється повідомлення з пропозицією встановити Nightingale як застосунок — з покроковою інструкцією для Windows, Mac, Android та iOS.',
        es: 'Un aviso de primera visita ahora sugiere instalar Nightingale como app en tu dispositivo, con una guía de un toque para Windows, Mac, Android e iOS.',
      },
      {
        type: 'new',
        en: 'The FAQ now includes step-by-step install instructions for every platform and a guide on how to change or customize the translation verification service.',
        uk: 'FAQ тепер містить покрокові інструкції зі встановлення для всіх платформ та посібник з налаштування сервісу перевірки перекладу.',
        es: 'La sección de Preguntas frecuentes ahora incluye instrucciones paso a paso para instalar en cada plataforma y una guía sobre cómo cambiar o personalizar el servicio de verificación de traducciones.',
      },
    ],
  },
  {
    version: '1.10.3',
    date: '2026-08-02',
    items: [
      {
        type: 'improved',
        en: 'Fresh icon set — all favicons, home-screen icons, and PWA tiles now use the new Nightingale artwork. The inline bird logo swaps between a brown bird (light mode) and a cream bird (dark mode) for clear contrast.',
        uk: 'Новий набір іконок — усі фавікони, значки домашнього екрану та PWA-плитки тепер використовують новий малюнок Nightingale. Вбудований логотип пташки перемикається між коричневою (світла тема) та кремовою (темна тема) версіями для чіткого контрасту.',
        es: 'Nuevos iconos — todos los favicons, iconos de pantalla de inicio y mosaicos PWA ahora usan el nuevo arte de Nightingale. El logo de pájaro en línea alterna entre un pájaro marrón (modo claro) y uno crema (modo oscuro) para un contraste nítido.',
      },
      {
        type: 'fixed',
        en: 'Fixed the PWA manifest theme and background colors — they now use the Nightingale brand green instead of the default blue.',
        uk: 'Виправлено колір теми та фону маніфесту PWA — тепер вони використовують фірмовий зелений Nightingale замість стандартного синього.',
        es: 'Corregidos los colores del tema y fondo del manifiesto PWA — ahora usan el verde de la marca Nightingale en lugar del azul predeterminado.',
      },
    ],
  },
  {
    version: '1.10.2',
    date: '2026-08-02',
    items: [
      {
        type: 'improved',
        en: 'Translations now sound more natural and colloquial — Olia\'s output better matches everyday spoken language instead of leaning too formal or textbook-heavy.',
        uk: 'Переклади тепер звучать природніше й розмовніше — відповіді Олі краще відповідають живій мові замість підручникового стилю.',
        es: 'Las traducciones ahora suenan más naturales y coloquiales — las respuestas de Olia se ajustan mejor al habla cotidiana en lugar de sonar demasiado formales o académicas.',
      },
    ],
  },
  {
    version: '1.10.1',
    date: '2026-08-02',
    items: [
      {
        type: 'new',
        en: 'The rest of the Nightingale interface is now fully available in Spanish — the marketing site, the “Why Nightingale” story, the developer story, the changelog, and the Privacy and Terms pages.',
        uk: 'Решта інтерфейсу Nightingale тепер повністю доступна іспанською — маркетинговий сайт, історія «Чому Nightingale», історія розробника, журнал змін та сторінки конфіденційності й умов.',
        es: 'El resto de la interfaz de Nightingale ya está completamente disponible en español: el sitio de presentación, la historia de «Por qué Nightingale», la historia del desarrollador, el registro de cambios y las páginas de Privacidad y Términos.',
      },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-08-02',
    items: [
      {
        type: 'new',
        en: 'Spanish has arrived! You can now translate between Ukrainian and Spanish, with a choice of varieties — Latin American, Castilian, Mexican, Rioplatense, or Colombian.',
        uk: 'Іспанська вже тут! Тепер ви можете перекладати між українською та іспанською, обираючи варіант — латиноамериканський, кастильський, мексиканський, ріоплатський або колумбійський.',
        es: '¡Llegó el español! Ahora puedes traducir entre ucraniano y español, con opción de variedades: latinoamericano, castellano, mexicano, rioplatense o colombiano.',
      },
      {
        type: 'new',
        en: 'You can now use the whole app in Spanish — choose Español as your app language in Settings.',
        uk: 'Тепер ви можете користуватися всім застосунком іспанською — оберіть Español як мову застосунку в налаштуваннях.',
        es: 'Ahora puedes usar toda la app en español — elige Español como idioma de la aplicación en Ajustes.',
      },
      {
        type: 'improved',
        en: 'Your app language and your translation language are now independent — keep the interface in English while translating between Spanish and Ukrainian, or any combination you like.',
        uk: 'Мова застосунку та мова перекладу тепер незалежні — залиште інтерфейс англійською, перекладаючи між іспанською та українською, або будь-яку комбінацію на ваш смак.',
        es: 'El idioma de la app y el idioma de traducción ahora son independientes — mantén la interfaz en inglés mientras traduces entre español y ucraniano, o la combinación que prefieras.',
      },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-08-02',
    items: [
      {
        type: 'new',
        en: 'A new reporting tool lets you flag anything that needs a second look — a bug, an incorrect or inappropriate translation, or wording that just does not sound natural. Look for the Report button in the disclaimer bar on the Translate, Chat, and Upload screens.',
        uk: 'Новий інструмент звітування дає змогу позначити все, що потребує перевірки — помилку, неточний чи недоречний переклад або формулювання, яке просто звучить неприродно. Шукайте кнопку «Повідомити» у смузі застереження на екранах перекладу, чату та завантаження.',
        es: 'Una nueva herramienta de reportes te permite señalar cualquier cosa que necesite revisión — un error, una traducción incorrecta o inapropiada, o una redacción que simplemente no suena natural. Busca el botón Reportar en la barra de aviso de las pantallas de Traducir, Chat y Subir.',
      },
      {
        type: 'new',
        en: 'When you send a report, you can optionally attach a screenshot of the current screen so we can see exactly the content you are reporting.',
        uk: 'Надсилаючи повідомлення, ви можете за бажанням додати знімок поточного екрана, щоб ми точно бачили вміст, про який йдеться.',
        es: 'Al enviar un reporte, puedes adjuntar opcionalmente una captura de la pantalla actual para que veamos exactamente el contenido que reportas.',
      },
      {
        type: 'new',
        en: 'A subtle disclaimer now appears on the AI-powered screens, a gentle reminder that AI can occasionally get things wrong.',
        uk: 'На екранах із ШІ тепер з’являється ненав’язливе застереження — м’яке нагадування, що ШІ іноді може помилятися.',
        es: 'Ahora aparece un aviso sutil en las pantallas con IA, un recordatorio amable de que la IA puede equivocarse de vez en cuando.',
      },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-07-20',
    items: [
      {
        type: 'new',
        en: 'A new Paste button appears in the source panel when it is empty, so you can drop in text from your clipboard with a single tap.',
        uk: 'Нова кнопка «Вставити» з’являється в панелі джерела, коли вона порожня, тож ви можете додати текст із буфера обміну одним дотиком.',
        es: 'Un nuevo botón Pegar aparece en el panel de origen cuando está vacío, para que agregues texto desde el portapapeles con un solo toque.',
      },
      {
        type: 'new',
        en: 'Quick controls now sit pinned at the bottom of the translation view: switch the output Style and Format on the fly, toggle emojis, and re-translate instantly — with a handy “set as default” switch for each.',
        uk: 'Швидкі елементи керування тепер закріплені внизу вікна перекладу: миттєво змінюйте стиль і формат виводу, вмикайте емодзі та перекладайте заново — з зручним перемикачем «за замовчуванням» для кожного.',
        es: 'Los controles rápidos ahora están fijados en la parte inferior de la vista de traducción: cambia el Estilo y el Formato de salida al instante, activa los emojis y vuelve a traducir de inmediato — con un práctico interruptor de «establecer como predeterminado» para cada uno.',
      },
      {
        type: 'new',
        en: 'New Output Format setting tailors translations for how you will use them — spoken, email, text message, social media, or general.',
        uk: 'Нове налаштування «Формат виводу» адаптує переклади під те, як ви їх використаєте — усне мовлення, лист, повідомлення, соцмережі або загальний.',
        es: 'El nuevo ajuste de Formato de salida adapta las traducciones a cómo las usarás — habladas, correo, mensaje de texto, redes sociales o general.',
      },
      {
        type: 'new',
        en: 'Optional emojis can now be woven into your translations, chosen to fit the tone and context of each message.',
        uk: 'Тепер до перекладів можна додавати емодзі, підібрані під тон і контекст кожного повідомлення.',
        es: 'Ahora se pueden incluir emojis opcionales en tus traducciones, elegidos para encajar con el tono y el contexto de cada mensaje.',
      },
      {
        type: 'new',
        en: 'You can now choose how the Enter key behaves — send, or add a new line — separately for the translation and chat views.',
        uk: 'Тепер ви можете обрати, як діє клавіша Enter — надіслати чи додати новий рядок — окремо для перекладу та чату.',
        es: 'Ahora puedes elegir cómo se comporta la tecla Enter — enviar o agregar una nueva línea — por separado para las vistas de traducción y de chat.',
      },
      {
        type: 'new',
        en: 'Your name in the header now shows your preferred nickname and opens your profile in one click, where you can manage your email, sign-in method, connect or disconnect Google, and set a password.',
        uk: 'Ваше ім’я у заголовку тепер показує обраний псевдонім і відкриває профіль одним кліком, де ви можете керувати поштою, способом входу, підключати чи від’єднувати Google та встановлювати пароль.',
        es: 'Tu nombre en el encabezado ahora muestra tu apodo preferido y abre tu perfil con un clic, donde puedes gestionar tu correo, tu método de inicio de sesión, conectar o desconectar Google y establecer una contraseña.',
      },
      {
        type: 'improved',
        en: 'The former “Output Format” setting is now clearly labelled “Output Style” to sit alongside the new format options.',
        uk: 'Колишнє налаштування «Формат виводу» тепер має чітку назву «Стиль виводу», щоб поєднуватися з новими параметрами формату.',
        es: 'El antiguo ajuste «Formato de salida» ahora se llama claramente «Estilo de salida» para acompañar las nuevas opciones de formato.',
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
        es: 'Los Ajustes ahora tienen su propio botón en el encabezado móvil — justo entre el selector de tema y el menú — para que estén siempre a un toque en cada pantalla.',
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
        es: 'Un botón Borrar de un toque ahora vacía el panel de origen, y un botón Copiar copia tu texto de origen al portapapeles.',
      },
      {
        type: 'improved',
        en: 'Swapping languages now keeps your text in place, and clearing empties both panels at once for a cleaner start.',
        uk: 'Перемикання мов тепер зберігає ваш текст на місці, а очищення звільняє обидві панелі одночасно для чистого початку.',
        es: 'Intercambiar idiomas ahora mantiene tu texto en su lugar, y borrar vacía ambos paneles a la vez para empezar de forma más limpia.',
      },
      {
        type: 'improved',
        en: 'Added behind-the-scenes safeguards that keep the service fast and reliable during heavy usage.',
        uk: 'Додано приховані запобіжники, які підтримують швидку та надійну роботу сервісу під час високого навантаження.',
        es: 'Se agregaron protecciones internas que mantienen el servicio rápido y fiable durante un uso intenso.',
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
        es: 'Tus preferencias de traducción ahora se guardan automáticamente y acompañan a tu cuenta en todos los dispositivos y navegadores cuando inicias sesión.',
      },
      {
        type: 'new',
        en: 'A quick confirmation now appears each time a preference is saved, so you always know your changes were kept.',
        uk: 'Тепер щоразу після збереження налаштування зʼявляється коротке підтвердження, тож ви завжди бачите, що зміни збережено.',
        es: 'Ahora aparece una confirmación rápida cada vez que se guarda una preferencia, para que siempre sepas que tus cambios se conservaron.',
      },
      {
        type: 'improved',
        en: 'The translate button now stays visible at the bottom of the source panel even while scrolling through long text.',
        uk: 'Кнопка перекладу тепер залишається видимою внизу панелі джерела навіть під час прокручування довгого тексту.',
        es: 'El botón de traducir ahora permanece visible en la parte inferior del panel de origen incluso al desplazarte por textos largos.',
      },
      {
        type: 'improved',
        en: 'The chat message box now grows as you type so you can see your whole message before sending.',
        uk: 'Поле повідомлення в чаті тепер збільшується під час набору, тож ви бачите все повідомлення перед надсиланням.',
        es: 'El cuadro de mensaje del chat ahora crece a medida que escribes para que veas todo tu mensaje antes de enviarlo.',
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
        es: 'Elige tu variedad de inglés — estadounidense, británico, australiano, canadiense o internacional — y Olia adapta la ortografía, el vocabulario y los modismos.',
      },
      {
        type: 'improved',
        en: 'Your history now records which English variety each translation used and shows the matching flag.',
        uk: 'Ваша історія тепер запамʼятовує, який варіант англійської використано для кожного перекладу, і показує відповідний прапор.',
        es: 'Tu historial ahora registra qué variedad de inglés se usó en cada traducción y muestra la bandera correspondiente.',
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
        es: 'Se agregó un recorrido guiado y un centro de Ayuda para que aprender cada función sea fácil.',
      },
      {
        type: 'new',
        en: 'Added bot protection on sign-in and sign-up to keep accounts safe.',
        uk: 'Додано захист від ботів під час входу та реєстрації для безпеки облікових записів.',
        es: 'Se agregó protección contra bots en el inicio de sesión y el registro para mantener las cuentas seguras.',
      },
      {
        type: 'improved',
        en: 'Added a Terms of Service page alongside the Privacy Policy.',
        uk: 'Додано сторінку Умов використання поруч з Політикою конфіденційності.',
        es: 'Se agregó una página de Términos del servicio junto a la Política de privacidad.',
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
        es: 'Nightingale ahora se puede instalar como app y funciona sin conexión.',
      },
      {
        type: 'improved',
        en: 'The welcome screen loads much faster thanks to optimized media.',
        uk: 'Вітальний екран завантажується значно швидше завдяки оптимізованим медіа.',
        es: 'La pantalla de bienvenida carga mucho más rápido gracias a los medios optimizados.',
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
        es: 'Se agregó la traducción de imágenes y documentos — sube una foto o un archivo y obtén el texto traducido con notas culturales.',
      },
      {
        type: 'new',
        en: 'Added voice input and spoken playback for translations.',
        uk: 'Додано голосове введення та озвучування перекладів.',
        es: 'Se agregó la entrada de voz y la reproducción hablada de las traducciones.',
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
        es: 'Conoce a Olia — chatea con tu guía de idiomas con IA y usa el modo de Conversación en vivo para la traducción de voz bidireccional en tiempo real.',
      },
      {
        type: 'improved',
        en: 'Refreshed the app with the Nightingale name and visual identity.',
        uk: 'Оновлено застосунок з назвою та візуальним стилем Nightingale.',
        es: 'Se renovó la app con el nombre y la identidad visual de Nightingale.',
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
        es: 'Lanzamiento inicial: traducción ucraniano ↔ inglés lado a lado con contexto cultural, opciones de dialecto y tono, cuentas e historial guardado.',
      },
    ],
  },
];
