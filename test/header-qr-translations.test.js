import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const translations = {
    'pt-BR': { scan: 'Escanear código QR', animated: 'Transferir via QR animado', android: 'Baixar APK' },
    'pt-PT': { scan: 'Ler código QR', animated: 'Transferir através de QR animado', android: 'Transferir APK' },
    es: { scan: 'Escanear código QR', animated: 'Transferir mediante QR animado', android: 'Descargar APK' },
    fr: { scan: 'Scanner le code QR', animated: 'Transférer via un QR animé', android: 'Télécharger l’APK' },
    de: { scan: 'QR-Code scannen', animated: 'Über animierten QR-Code übertragen', android: 'APK herunterladen' },
    it: { scan: 'Scansiona codice QR', animated: 'Trasferisci tramite QR animato', android: 'Scarica APK' },
    ru: { scan: 'Сканировать QR-код', animated: 'Передать через анимированный QR-код', android: 'Скачать APK' },
    'zh-CN': { scan: '扫描二维码', animated: '通过动态二维码传输', android: '下载 APK' }
};

for (const [locale, expected] of Object.entries(translations)) {
    const file = path.join('public', 'lang', locale + '.json');
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(doc.header['scan-qr_title'], expected.scan, locale + ': QR scan title');
    assert.equal(doc.header['scan-qr'].title, expected.scan, locale + ': nested QR scan title');
    assert.equal(doc.header['scan-qr_aria-label'], expected.scan, locale + ': QR scan accessible label');
    assert.equal(doc.header['animated-qr_title'], expected.animated, locale + ': animated QR title');
    assert.equal(doc.header['animated-qr'].title, expected.animated, locale + ': nested animated QR title');
    assert.equal(doc.header['animated-qr_aria-label'], expected.animated, locale + ': animated QR accessible label');
    assert.equal(doc.header['android_title'], expected.android, locale + ': Android download title');
    assert.notEqual(doc.header['animated-qr_title'], 'Transfer via Animated QR', locale + ': untranslated English label');
}

console.log('Header QR translations and JSON validity passed for 8 locales.');
