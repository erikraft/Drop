const POE_BASE_URL = process.env.POE_API_BASE_URL || "https://api.poe.com/v1";

async function requestPoeChatCompletion(body) {
    const apiKey = process.env.POE_API_KEY;

    if (!apiKey) {
        throw new Error("POE_API_KEY is not configured.");
    }

    const response = await fetch(`${POE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`POE API request failed: ${response.status} ${response.statusText} - ${detail}`.trim());
    }

    return response.json();
}

function normalizeMessageContent(content) {
    if (!content) {
        return "";
    }

    if (Array.isArray(content)) {
        return content
            .map(part => {
                if (!part) return "";
                if (typeof part === "string") return part;
                if (typeof part === "object" && part.text) return part.text;
                return JSON.stringify(part);
            })
            .join("\n");
    }

    if (typeof content === "object" && content.text) {
        return content.text;
    }

    return String(content);
}

function extractImagePayload(rawContent, fallbackMime = "image/png") {
    if (!rawContent || typeof rawContent !== "string") {
        return null;
    }

    const dataUrlMatch = rawContent.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUrlMatch) {
        return { type: "data_url", value: dataUrlMatch[0] };
    }

    const urlMatch = rawContent.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
        return { type: "url", value: urlMatch[0] };
    }

    const compact = rawContent.replace(/\s+/g, "");
    if (/^[A-Za-z0-9+/=]+$/.test(compact) && compact.length > 256) {
        return {
            type: "base64",
            value: compact,
            mime: fallbackMime
        };
    }

    return {
        type: "text",
        value: rawContent
    };
}

export async function generateAiImage({
    prompt,
    imageBase64,
    imageMime,
    imageSize = "4K",
    webSearch = false,
    model = process.env.POE_MODEL || "nano-banana-pro"
}) {
    const messages = [
        {
            role: "system",
            content: "Você é um assistente criativo que responde apenas com dados de imagem gerados em formato base64 (data URL) sempre que possível."
        }
    ];

    if (prompt) {
        messages.push({
            role: "user",
            content: prompt
        });
    } else if (imageBase64) {
        messages.push({
            role: "user",
            content: "Crie uma variação artística da imagem enviada mantendo a mesma orientação. Retorne apenas a nova imagem em base64."
        });
    } else {
        messages.push({
            role: "user",
            content: "Gere uma imagem criativa em base64."
        });
    }

    const extraBody = {
        image_size: imageSize,
        image_only: Boolean(imageBase64),
        web_search: webSearch === true || webSearch === "true"
    };

    if (imageBase64) {
        extraBody.image_base64 = imageBase64;
        if (imageMime) {
            extraBody.image_mime_type = imageMime;
        }
    }

    const response = await requestPoeChatCompletion({
        model,
        messages,
        extra_body: extraBody
    });

    const choice = response?.choices?.[0];
    const rawContent = normalizeMessageContent(choice?.message?.content);
    const imagePayload = extractImagePayload(rawContent, imageMime);

    return {
        raw: rawContent,
        image: imagePayload
    };
}

export async function handleAiImageRequest(req, res) {
    try {
        let imageBase64 = null;
        let imageMime = null;

        if (req.file) {
            imageBase64 = req.file.buffer.toString("base64");
            imageMime = req.file.mimetype || "image/png";
        }

        const prompt = req.body?.prompt;
        const imageSize = req.body?.imageSize || "4K";
        const webSearch = req.body?.webSearch;

        const result = await generateAiImage({
            prompt,
            imageBase64,
            imageMime,
            imageSize,
            webSearch
        });

        if (!result.image || result.image.type === "text") {
            return res.status(502).json({
                success: false,
                message: "Não foi possível gerar uma imagem com a resposta recebida da IA.",
                raw: result.raw
            });
        }

        return res.json({
            success: true,
            image: result.image,
            raw: result.raw
        });
    }
    catch (error) {
        console.error("AI image generation failed:", error);

        if (error.message && error.message.includes("POE_API_KEY")) {
            return res.status(500).json({
                success: false,
                message: "POE_API_KEY não configurada no servidor."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Erro ao gerar imagem com IA.",
            detail: error.message
        });
    }
}
