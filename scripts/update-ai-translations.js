// scripts/update-ai-translations.js
import { promises as fs } from "fs";
import path from "path";

const LANG_DIR = path.resolve("public", "lang");

// Traduções das novas chaves. Ajuste/contribua se tiver melhores traduções.
const TRANSLATIONS = {
  "af": {
    header: {
      "ai-variation": "Genereer AI-versie",
      "ai-generate": "Skep nuwe AI-beeld"
    },
    dialogs: {
      "edit-ai": "Wysig met AI"
    }
  },
  "ar": {
    header: {
      "ai-variation": "توليد تصميم AI",
      "ai-generate": "إنشاء صورة AI جديدة"
    },
    dialogs: {
      "edit-ai": "تحرير باستخدام AI"
    }
  },
  "bn": {
    header: {
      "ai-variation": "এই AI ভার্সন তৈরি করুন",
      "ai-generate": "AI এবং তৈরি করুন"
    },
    dialogs: {
      "edit-ai": "AI দিয়ে সম্পাদনা করুন"
    }
  },
  "de": {
    header: {
      "ai-variation": "Generiere AI-Variante",
      "ai-generate": "Erstelle neue AI-Bild"
    },
    dialogs: {
      "edit-ai": "Mit AI bearbeiten"
    }
  },
  "en": {
    header: {
      "ai-variation": "Generate AI variation",
      "ai-generate": "Create new AI image"
    },
    dialogs: {
      "edit-ai": "Edit with AI"
    }
  },
  "es": {
    header: {
      "ai-variation": "Generar variación AI",
      "ai-generate": "Crear nueva imagen AI"
    },
    dialogs: {
      "edit-ai": "Editar con IA"
    }
  },
  "fr": {
    header: {
      "ai-variation": "Générer une variante AI",
      "ai-generate": "Créer une nouvelle image AI"
    },
    dialogs: {
      "edit-ai": "Modifier avec IA"
    }
  },
  "hi": {
    header: {
      "ai-variation": "AI वर्जन करें",
      "ai-generate": "नया AI छवि बनाएं"
    },
    dialogs: {
      "edit-ai": "AI के साथ संपादित करें"
    }
  },
  "pt-BR": {
    header: {
      "ai-variation": "Gerar variação com IA",
      "ai-generate": "Criar nova imagem com IA"
    },
    dialogs: {
      "edit-ai": "Editar com IA"
    }
  },
  "ru": {
    header: {
      "ai-variation": "Создать вариант AI",
      "ai-generate": "Создать новую AI-изображение"
    },
    dialogs: {
      "edit-ai": "Редактировать с помощью AI"
    }
  },
  "zh-CN": {
    header: {
      "ai-variation": "生成 AI 变体",
      "ai-generate": "创建新的 AI 图像"
    },
    dialogs: {
      "edit-ai": "使用 AI 编辑"
    }
  },
  "zh-TW": {
    header: {
      "ai-variation": "生成 AI 變體",
      "ai-generate": "建立新的 AI 圖像"
    },
    dialogs: {
      "edit-ai": "使用 AI 編輯"
    }
  }
};

// Fallback em inglês para os idiomas que não estiverem mapeados.
const FALLBACK = TRANSLATIONS["en"];

async function updateLangFile(filePath) {
  const locale = path.basename(filePath, ".json");
  const fileContent = await fs.readFile(filePath, "utf8");
  let doc;
  try {
    doc = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse ${path.relative(process.cwd(), filePath)}: ${error.message}`);
  }

  doc.header ??= {};
  doc.dialogs ??= {};

  const source = TRANSLATIONS[locale] ?? FALLBACK;

  // Header keys
  doc.header["ai-variation"] ??= source.header["ai-variation"];
  doc.header["ai-generate"] ??= source.header["ai-generate"];

  // Dialog key
  doc.dialogs["edit-ai"] ??= source.dialogs["edit-ai"];

  const updated = JSON.stringify(doc, null, 4) + "\n";
  await fs.writeFile(filePath, updated, "utf8");
  console.log(`Updated ${locale}`);
}

async function main() {
  const entries = await fs.readdir(LANG_DIR);
  const jsonFiles = entries.filter((name) => name.endsWith(".json"));

  for (const name of jsonFiles) {
    const filePath = path.join(LANG_DIR, name);
    await updateLangFile(filePath);
  }

  console.log("Finished updating AI translations.");
}

main().catch((err) => {
  console.error("Failed to update translations:", err);
  process.exit(1);
});