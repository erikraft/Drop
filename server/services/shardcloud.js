import {createClient} from 'redis';
import {randomUUID} from 'crypto';

const REDIS_KEY_PREFIX = 'drop:cloud:';

let redisClientPromise = null;

export class ShardCloudConfigError extends Error {
    constructor(message = 'ShardCloud configuration is missing') {
        super(message);
        this.name = 'ShardCloudConfigError';
    }
}

export class ShardCloudStorageError extends Error {
    constructor(message = 'ShardCloud storage error', code = 'UNKNOWN') {
        super(message);
        this.name = 'ShardCloudStorageError';
        this.code = code;
    }
}

function isCapacityError(error) {
    const message = error?.message?.toLowerCase?.() ?? '';
    return message.includes('oom') || message.includes('maxmemory') || message.includes('quota');
}

export async function getShardCloudClient() {
    if (!redisClientPromise) {
        const redisUrl = process.env.SHARDCLOUD_REDIS_URL;

        if (!redisUrl) {
            throw new ShardCloudConfigError();
        }

        const client = createClient({
            url: redisUrl,
            socket: {
                tls: redisUrl.startsWith('rediss://')
            }
        });

        client.on('error', error => {
            console.error('ShardCloud Redis error:', error);
        });

        redisClientPromise = client.connect().then(() => client);
    }

    return redisClientPromise;
}

export async function storeFileOnShardCloud({buffer, originalName, mimeType, expirySeconds}) {
    try {
        const client = await getShardCloudClient();
        const id = randomUUID();
        const baseKey = `${REDIS_KEY_PREFIX}${id}`;
        const dataKey = `${baseKey}:data`;
        const metaKey = `${baseKey}:meta`;

        const metadata = {
            name: originalName || 'file',
            mimeType: mimeType || 'application/octet-stream',
            size: buffer?.length ?? 0
        };

        const pipeline = client.multi();
        pipeline.set(dataKey, buffer, {EX: expirySeconds});
        pipeline.set(metaKey, JSON.stringify(metadata), {EX: expirySeconds});

        const results = await pipeline.exec();

        if (!results) {
            throw new Error('Failed to execute Redis pipeline');
        }

        return {id};
    }
    catch (error) {
        if (error instanceof ShardCloudConfigError) {
            throw error;
        }

        if (isCapacityError(error)) {
            throw new ShardCloudStorageError('ShardCloud storage capacity reached', 'CAPACITY');
        }

        throw new ShardCloudStorageError(error.message);
    }
}

export async function fetchFileFromShardCloud(id) {
    try {
        const client = await getShardCloudClient();
        const baseKey = `${REDIS_KEY_PREFIX}${id}`;
        const dataKey = `${baseKey}:data`;
        const metaKey = `${baseKey}:meta`;

        const [buffer, metaJson] = await Promise.all([
            client.get(dataKey, {returnBuffers: true}),
            client.get(metaKey)
        ]);

        if (!buffer || !metaJson) {
            return null;
        }

        let metadata = {};
        try {
            metadata = JSON.parse(metaJson);
        }
        catch (_) {
            metadata = {};
        }

        return {
            buffer,
            name: metadata.name || 'download',
            mimeType: metadata.mimeType || 'application/octet-stream',
            size: metadata.size ?? buffer.length
        };
    }
    catch (error) {
        if (error instanceof ShardCloudConfigError) {
            throw error;
        }

        throw new ShardCloudStorageError(error.message);
    }
}

export function getDownloadPath(id) {
    return `/cloud-download/${id}`;
}
