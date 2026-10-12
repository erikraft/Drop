const DEFAULT_SERVER_URL = 'https://drop.erikraft.com/';

const SERVER_INSTANCES = Object.freeze([
  { id: 'primary', label: 'drop.erikraft.com', url: DEFAULT_SERVER_URL },
  { id: 'fallback-dash', label: 'drop-fallback.erikraft.com', url: 'https://drop-fallback.erikraft.com/' },
  { id: 'fallback-compact', label: 'dropfallback.erikraft.com', url: 'https://dropfallback.erikraft.com/' }
]);

const SERVER_MENU_LABELS = Object.freeze({
  af: 'Verander bediener…', ar: 'تغيير الخادم…', bg: 'Промяна на сървъра…',
  ca: 'Canvia el servidor…', cs: 'Změnit server…', da: 'Skift server…',
  de: 'Server ändern…', el: 'Αλλαγή διακομιστή…', en: 'Change server…',
  es: 'Cambiar servidor…', fi: 'Vaihda palvelin…', fr: 'Changer de serveur…',
  he: 'החלפת שרת…', hi: 'सर्वर बदलें…', hr: 'Promijeni poslužitelj…',
  hu: 'Kiszolgáló módosítása…', id: 'Ubah server…', it: 'Cambia server…',
  ja: 'サーバーを変更…', ko: '서버 변경…', mk: 'Промени сервер…',
  ne: 'सर्भर परिवर्तन गर्नुहोस्…', nl: 'Server wijzigen…', no: 'Bytt server…',
  pl: 'Zmień serwer…', 'pt-br': 'Alterar servidor…', 'pt-pt': 'Alterar servidor…',
  ro: 'Schimbă serverul…', ru: 'Сменить сервер…', sk: 'Zmeniť server…',
  sl: 'Spremeni strežnik…', sr: 'Промени сервер…', sv: 'Byt server…',
  tr: 'Sunucuyu değiştir…', uk: 'Змінити сервер…', vi: 'Đổi máy chủ…',
  'zh-cn': '更改服务器…', 'zh-tw': '更改伺服器…'
});

function resolveDesktopLocale(locale) {
  const normalized = String(locale || 'en').replace(/_/g, '-').toLowerCase();
  if (normalized.startsWith('zh-hant') || normalized.startsWith('zh-tw')) return 'zh-tw';
  if (normalized.startsWith('zh-hans') || normalized.startsWith('zh-cn') || normalized === 'zh') return 'zh-cn';
  if (normalized.startsWith('pt-br')) return 'pt-br';
  if (normalized.startsWith('pt-pt')) return 'pt-pt';
  if (normalized === 'pt') return 'pt-br';
  return SERVER_MENU_LABELS[normalized] ? normalized :
    (SERVER_MENU_LABELS[normalized.split('-')[0]] ? normalized.split('-')[0] : 'en');
}

function getServerMenuLabel(locale) {
  return SERVER_MENU_LABELS[resolveDesktopLocale(locale)] || SERVER_MENU_LABELS.en;
}


const DESKTOP_MENU_TRANSLATIONS = Object.freeze({
  af: { app: 'ErikrafT Drop™', edit: 'Wysig', view: 'Bekyk', window: 'Venster' },
  ar: { app: 'ErikrafT Drop™', edit: 'تحرير', view: 'عرض', window: 'نافذة' },
  bg: { app: 'ErikrafT Drop™', edit: 'Редактиране', view: 'Изглед', window: 'Прозорец' },
  ca: { app: 'ErikrafT Drop™', edit: 'Edita', view: 'Visualització', window: 'Finestra' },
  cs: { app: 'ErikrafT Drop™', edit: 'Úpravy', view: 'Zobrazení', window: 'Okno' },
  da: { app: 'ErikrafT Drop™', edit: 'Rediger', view: 'Vis', window: 'Vindue' },
  de: { app: 'ErikrafT Drop™', edit: 'Bearbeiten', view: 'Ansicht', window: 'Fenster' },
  el: { app: 'ErikrafT Drop™', edit: 'Επεξεργασία', view: 'Προβολή', window: 'Παράθυρο' },
  en: { app: 'ErikrafT Drop™', edit: 'Edit', view: 'View', window: 'Window' },
  es: { app: 'ErikrafT Drop™', edit: 'Editar', view: 'Ver', window: 'Ventana' },
  fi: { app: 'ErikrafT Drop™', edit: 'Muokkaa', view: 'Näytä', window: 'Ikkuna' },
  fr: { app: 'ErikrafT Drop™', edit: 'Édition', view: 'Affichage', window: 'Fenêtre' },
  he: { app: 'ErikrafT Drop™', edit: 'עריכה', view: 'תצוגה', window: 'חלון' },
  hi: { app: 'ErikrafT Drop™', edit: 'संपादित करें', view: 'दृश्य', window: 'विंडो' },
  hr: { app: 'ErikrafT Drop™', edit: 'Uredi', view: 'Prikaz', window: 'Prozor' },
  hu: { app: 'ErikrafT Drop™', edit: 'Szerkesztés', view: 'Nézet', window: 'Ablak' },
  id: { app: 'ErikrafT Drop™', edit: 'Edit', view: 'Tampilan', window: 'Jendela' },
  it: { app: 'ErikrafT Drop™', edit: 'Modifica', view: 'Visualizza', window: 'Finestra' },
  ja: { app: 'ErikrafT Drop™', edit: '編集', view: '表示', window: 'ウィンドウ' },
  ko: { app: 'ErikrafT Drop™', edit: '편집', view: '보기', window: '창' },
  mk: { app: 'ErikrafT Drop™', edit: 'Уреди', view: 'Приказ', window: 'Прозорец' },
  ne: { app: 'ErikrafT Drop™', edit: 'सम्पादन', view: 'दृश्य', window: 'सञ्झ्याल' },
  nl: { app: 'ErikrafT Drop™', edit: 'Bewerken', view: 'Weergave', window: 'Venster' },
  no: { app: 'ErikrafT Drop™', edit: 'Rediger', view: 'Vis', window: 'Vindu' },
  pl: { app: 'ErikrafT Drop™', edit: 'Edycja', view: 'Widok', window: 'Okno' },
  'pt-br': { app: 'ErikrafT Drop™', edit: 'Editar', view: 'Exibir', window: 'Janela' },
  'pt-pt': { app: 'ErikrafT Drop™', edit: 'Editar', view: 'Ver', window: 'Janela' },
  ro: { app: 'ErikrafT Drop™', edit: 'Editare', view: 'Vizualizare', window: 'Fereastră' },
  ru: { app: 'ErikrafT Drop™', edit: 'Правка', view: 'Вид', window: 'Окно' },
  sk: { app: 'ErikrafT Drop™', edit: 'Upraviť', view: 'Zobraziť', window: 'Okno' },
  sl: { app: 'ErikrafT Drop™', edit: 'Uredi', view: 'Pogled', window: 'Okno' },
  sr: { app: 'ErikrafT Drop™', edit: 'Уреди', view: 'Приказ', window: 'Прозор' },
  sv: { app: 'ErikrafT Drop™', edit: 'Redigera', view: 'Visa', window: 'Fönster' },
  tr: { app: 'ErikrafT Drop™', edit: 'Düzenle', view: 'Görünüm', window: 'Pencere' },
  uk: { app: 'ErikrafT Drop™', edit: 'Редагування', view: 'Вигляд', window: 'Вікно' },
  vi: { app: 'ErikrafT Drop™', edit: 'Chỉnh sửa', view: 'Xem', window: 'Cửa sổ' },
  'zh-cn': { app: 'ErikrafT Drop™', edit: '编辑', view: '视图', window: '窗口' },
  'zh-tw': { app: 'ErikrafT Drop™', edit: '編輯', view: '檢視', window: '視窗' }
});

function getDesktopMenuTranslations(locale) {
  return DESKTOP_MENU_TRANSLATIONS[resolveDesktopLocale(locale)] || DESKTOP_MENU_TRANSLATIONS.en;
}

function normalizeServerUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('Only HTTP(S) URLs without embedded credentials are supported.');
  }

  parsed.hash = '';
  return parsed.href;
}

module.exports = { DEFAULT_SERVER_URL, SERVER_INSTANCES, SERVER_MENU_LABELS, getServerMenuLabel, DESKTOP_MENU_TRANSLATIONS, getDesktopMenuTranslations, normalizeServerUrl };
