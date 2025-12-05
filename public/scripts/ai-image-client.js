(() => {
    const AI_ENDPOINT = '/api/ai/image';
    const DEFAULT_IMAGE_NAME = 'ai-image.png';

    async function toJson(response) {
        try {
            return await response.json();
        }
        catch (err) {
            console.error('Failed to parse AI response JSON', err);
            return null;
        }
    }

    function normalizeError(message, detail) {
        return {
            success: false,
            message: message || 'Erro ao gerar imagem com IA.',
            detail: detail || null
        };
    }

    function dataUrlToFile(dataUrl, name = DEFAULT_IMAGE_NAME) {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
            return null;
        }

        const [header, base64Data] = dataUrl.split(',');
        if (!header || !base64Data) {
            return null;
        }

        const match = header.match(/data:(.*);base64/);
        const mime = match && match[1] ? match[1] : 'image/png';
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        return new File([bytes], name, { type: mime });
    }

    async function requestAiImage({ prompt = '', imageFile = null, imageSize = '4K', webSearch = false } = {}) {
        const body = new FormData();
        if (prompt) {
            body.append('prompt', prompt);
        }
        body.append('imageSize', imageSize);
        body.append('webSearch', webSearch ? 'true' : 'false');

        if (imageFile instanceof File) {
            body.append('image', imageFile, imageFile.name || 'image.png');
        }

        try {
            const response = await fetch(AI_ENDPOINT, {
                method: 'POST',
                body
            });

            const payload = await toJson(response);

            if (!response.ok || !payload?.success) {
                const message = payload?.message || `Erro ${response.status}`;
                const detail = payload?.detail || payload?.raw || null;
                throw normalizeError(message, detail);
            }

            return payload;
        }
        catch (error) {
            if (error?.success === false) {
                throw error;
            }
            throw normalizeError(error?.message || 'Falha ao chamar IA.');
        }
    }

    const AiImageClient = {
        async generateVariationFromFile(file, options = {}) {
            if (!(file instanceof File)) {
                throw normalizeError('Arquivo inválido para gerar variação.');
            }

            const { imageSize = '4K', webSearch = false } = options;
            return requestAiImage({ imageFile: file, imageSize, webSearch });
        },

        async generateFromPrompt(prompt = '', options = {}) {
            const { imageSize = '4K', webSearch = false } = options;
            return requestAiImage({ prompt, imageSize, webSearch });
        },

        async toFile(aiResponse, { name = DEFAULT_IMAGE_NAME } = {}) {
            if (!aiResponse) return null;

            const payload = aiResponse.image;
            if (!payload) return null;

            if (payload.type === 'data_url') {
                return dataUrlToFile(payload.value, name);
            }

            if (payload.type === 'base64') {
                const bytes = Uint8Array.from(atob(payload.value), c => c.charCodeAt(0));
                return new File([bytes], name, { type: payload.mime || 'image/png' });
            }

            if (payload.type === 'url') {
                try {
                    const response = await fetch(payload.value);
                    const blob = await response.blob();
                    return new File([blob], name, { type: blob.type || 'image/png' });
                }
                catch (err) {
                    console.error('Failed to fetch image from URL payload', err);
                    return null;
                }
            }

            if (payload.type === 'text' && typeof payload.value === 'string' && payload.value.startsWith('data:image')) {
                return dataUrlToFile(payload.value, name);
            }

            return null;
        },

        normalizeError
    };

    window.AiImageClient = AiImageClient;
})();
