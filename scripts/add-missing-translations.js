// --- Importações necessárias ---
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Corrigir __dirname para ES Modules ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Caminho da pasta de idiomas ---
const langDir = path.join(__dirname, '..', 'public', 'lang');

// --- Leitura dos arquivos de idioma ---
const languageFiles = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));

console.log('Arquivos de idioma encontrados:', languageFiles);

// --- Traduções a adicionar ---
const translationsToAdd = {
    'header': {
        'cloud': {
            'en': 'Cloud',
            'pt-BR': 'Nuvem',
            'es': 'Nube',
            'fr': 'Nuage',
            'de': 'Cloud',
            'it': 'Cloud',
            'ja': 'クラウド',
            'zh-CN': '云',
            'zh-TW': '雲端',
            'ru': 'Облако',
            'ar': 'سحابة',
            'hi': 'क्लाउड',
            'default': 'Cloud'
        },
        'webchat': {
            'en': 'WebChat',
            'pt-BR': 'Bate-papo',
            'es': 'Chat',
            'fr': 'Chat',
            'de': 'Chat',
            'it': 'Chat',
            'ja': 'チャット',
            'zh-CN': '聊天',
            'zh-TW': '聊天室',
            'ru': 'Чат',
            'ar': 'دردشة',
            'hi': 'चैट',
            'default': 'Chat'
        }
    },
    'site': {
        'biodrop': {
            'en': 'Site',
            'pt-BR': 'Site',
            'es': 'Sitio',
            'fr': 'Site',
            'de': 'Webseite',
            'it': 'Sito',
            'ja': 'サイト',
            'zh-CN': '网站',
            'zh-TW': '網站',
            'ru': 'Сайт',
            'ar': 'موقع',
            'hi': 'साइट',
            'default': 'Site'
        }
    }
};

// --- Atualizar arquivos de tradução ---
languageFiles.forEach(file => {
    const filePath = path.join(langDir, file);
    const langCode = file.replace('.json', '');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(content);
        let updated = false;

        for (const [section, keys] of Object.entries(translationsToAdd)) {
            if (!translations[section]) translations[section] = {};
            
            for (const [key, langValues] of Object.entries(keys)) {
                if (translations[section][key] === undefined) {
                    const translation =
                        langValues[langCode] ||
                        langValues[langCode.split('-')[0]] ||
                        langValues['en'] ||
                        langValues['default'] ||
                        key;
                    translations[section][key] = translation;
                    updated = true;
                }
            }
        }

        if (updated) {
            const newContent = JSON.stringify(translations, null, 4) + '\n';
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ Atualizado: ${file}`);
        } else {
            console.log(`ℹ️ Nenhuma atualização necessária: ${file}`);
        }
    } catch (error) {
        console.error(`❌ Erro ao processar ${file}:`, error.message);
    }
});

console.log('✨ Atualização de traduções concluída!');
