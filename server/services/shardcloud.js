import {Blob, File, FormData} from 'node:buffer';

export class ShardCloudConfigError extends Error {
    constructor(message = 'ShardCloud configuration is missing') {
        super(message);
        this.name = 'ShardCloudConfigError';
    }
}

export class ShardCloudUploadError extends Error {
    constructor(message = 'ShardCloud upload failed', status) {
        super(message);
        this.name = 'ShardCloudUploadError';
        this.status = status;
    }
}

export async function uploadToShardCloud({buffer, originalName, mimeType, expiry}) {
    const uploadUrl = process.env.SHARDCLOUD_UPLOAD_URL;
    const apiToken = process.env.SHARDCLOUD_API_TOKEN;
    const projectId = process.env.SHARDCLOUD_PROJECT_ID;
    const databaseId = process.env.SHARDCLOUD_DATABASE_ID;

    if (!uploadUrl || !apiToken) {
        throw new ShardCloudConfigError();
    }

    const formData = new FormData();

    const filename = originalName || 'upload';
    const blob = new Blob([buffer], {type: mimeType || 'application/octet-stream'});
    const file = new File([blob], filename, {type: blob.type});

    formData.append('file', file);
    formData.append('expiry', expiry);

    if (projectId) {
        formData.append('project_id', projectId);
    }

    if (databaseId) {
        formData.append('database_id', databaseId);
    }

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiToken}`
        },
        body: formData
    });

    let data = null;
    try {
        data = await response.json();
    }
    catch (error) {
        // ignore json parse errors, handled below
    }

    if (!response.ok) {
        const message = data?.message || data?.error || response.statusText || 'ShardCloud upload failed';
        throw new ShardCloudUploadError(message, response.status);
    }

    const link = data?.link || data?.url || data?.downloadUrl || null;
    const expiresAt = data?.expiresAt || data?.expiry || data?.expires || null;

    if (!link) {
        throw new ShardCloudUploadError('ShardCloud response did not include a download link', response.status);
    }

    return {
        link,
        expiresAt
    };
}
