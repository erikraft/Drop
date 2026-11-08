const SENSITIVE_CONFIG_KEY = /password|credential|secret|token|username|api[_-]?key|private[_-]?key/i;

export function redactSensitiveConfig(value) {
    if (Array.isArray(value)) {
        return value.map(redactSensitiveConfig);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_CONFIG_KEY.test(key) ? '[REDACTED]' : redactSensitiveConfig(entry)
    ]));
}
