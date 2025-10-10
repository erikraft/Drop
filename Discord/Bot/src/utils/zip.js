import JSZip from 'jszip';

const DEFAULT_COMPRESSION = 'DEFLATE';
const MAX_BASE64_LENGTH = 5000;

function sanitizeFileName(name) {
    return name.replace(/[^\w\d().,;@ _-]/g, '_');
}

export async function createBase64Archive(files) {
    const zip = new JSZip();

    files.forEach(({ name, data }) => {
        zip.file(sanitizeFileName(name), data);
    });

    const base64 = await zip.generateAsync({
        type: 'base64',
        compression: DEFAULT_COMPRESSION,
        compressionOptions: { level: 9 }
    });

    return {
        base64,
        length: base64.length,
        tooLarge: base64.length > MAX_BASE64_LENGTH
    };
}

export { MAX_BASE64_LENGTH };
