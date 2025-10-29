const fs = require('fs');
const path = require('path');

// Define the translations to add
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

// Path to language files
const langDir = path.join(__dirname, '..', 'public', 'lang');

// Get all language files
const languageFiles = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));

languageFiles.forEach(file => {
    const filePath = path.join(langDir, file);
    const langCode = file.replace('.json', '');
    
    try {
        // Read the existing translations
        const content = fs.readFileSync(filePath, 'utf8');
        const translations = JSON.parse(content);
        let updated = false;

        // Add missing translations
        for (const [section, keys] of Object.entries(translationsToAdd)) {
            if (!translations[section]) {
                translations[section] = {};
            }
            
            for (const [key, langValues] of Object.entries(keys)) {
                if (translations[section][key] === undefined) {
                    // Try to get the translation for this language, fallback to English, then to default
                    const translation = langValues[langCode] || langValues[langCode.split('-')[0]] || langValues['en'] || langValues['default'] || key;
                    translations[section][key] = translation;
                    updated = true;
                }
            }
        }

        // Save the updated translations if there were any changes
        if (updated) {
            // Format with 4-space indentation and ensure proper line endings
            const newContent = JSON.stringify(translations, null, 4) + '\n';
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated translations in ${file}`);
        } else {
            console.log(`No updates needed for ${file}`);
        }
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
    }
});

console.log('Translation update complete!');
