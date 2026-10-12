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

function getServerMenuLabel(locale) {
  const normalized = String(locale || 'en').replace('_', '-').toLowerCase();
  return SERVER_MENU_LABELS[normalized] || SERVER_MENU_LABELS[normalized.split('-')[0]] || SERVER_MENU_LABELS.en;
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

module.exports = { DEFAULT_SERVER_URL, SERVER_INSTANCES, SERVER_MENU_LABELS, getServerMenuLabel, normalizeServerUrl };
