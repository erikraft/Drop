/**
 * WebSocket Origin checks protect browser clients from cross-origin websocket
 * access. They are not authentication: non-browser clients may omit Origin.
 */

export function isAllowedWebSocketOrigin(originHeader, hostHeader, allowedOrigins = []) {
    if (typeof originHeader !== "string" || !originHeader.trim()) {
        // Native clients and CLI tools commonly omit Origin.
        return true;
    }

    let origin;
    try {
        origin = new URL(originHeader);
    } catch {
        return false;
    }

    if (origin.protocol !== "https:" && origin.protocol !== "http:") return false;
    if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) return false;

    const normalizedAllowedOrigins = Array.isArray(allowedOrigins)
        ? allowedOrigins.filter(value => typeof value === "string")
        : [];

    if (normalizedAllowedOrigins.length) {
        return normalizedAllowedOrigins.includes(origin.origin);
    }

    if (typeof hostHeader !== "string" || !hostHeader.trim()) return false;
    return origin.host.toLowerCase() === hostHeader.trim().toLowerCase();
}
