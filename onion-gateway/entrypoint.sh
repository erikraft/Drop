#!/bin/sh
set -e

TOR_DIR="/var/lib/tor/erikraft_drop_onion"
TOR_USER="debian-tor"
if ! id "$TOR_USER" >/dev/null 2>&1; then
    TOR_USER="tor"
fi

DROP_PORT="${PORT:-3000}"

# Dynamic update of torrc port if PORT env variable is set
if [ -f /etc/tor/torrc ]; then
    sed -i "s/HiddenServicePort 80 127.0.0.1:[0-9]*/HiddenServicePort 80 127.0.0.1:${DROP_PORT}/g" /etc/tor/torrc
fi

mkdir -p "$TOR_DIR"

if [ -n "$ONION_PRIVATE_KEY_BASE64" ]; then
    echo "[ONION] Decoding ONION_PRIVATE_KEY_BASE64 secret..."
    echo "$ONION_PRIVATE_KEY_BASE64" | base64 -d > "$TOR_DIR/hs_ed25519_secret_key"
    chown -R "$TOR_USER:$TOR_USER" /var/lib/tor
    chmod 700 "$TOR_DIR"
    chmod 600 "$TOR_DIR/hs_ed25519_secret_key" 2>/dev/null || true
elif [ "$GENERATE_ONION_KEY" = "true" ]; then
    echo "[ONION] GENERATE_ONION_KEY is set to true. Tor will generate a new identity if none exists."
    chown -R "$TOR_USER:$TOR_USER" /var/lib/tor
    chmod 700 "$TOR_DIR"
else
    echo "[ONION] WARNING: ONION_PRIVATE_KEY_BASE64 secret is missing or empty."
    echo "[ONION] Tor Onion Service will NOT be loaded with a persistent key."
    echo "[ONION] To generate a key, run with GENERATE_ONION_KEY=true or follow onion-gateway/README.md instructions."
fi

if [ -n "$ONION_PRIVATE_KEY_BASE64" ] || [ "$GENERATE_ONION_KEY" = "true" ]; then
    echo "[ONION] Starting Tor..."
    su -s /bin/sh "$TOR_USER" -c "tor -f /etc/tor/torrc" &

    # Wait for hostname file to be generated / verified
    TIMEOUT=30
    COUNT=0
    while [ ! -f "$TOR_DIR/hostname" ] && [ $COUNT -lt $TIMEOUT ]; do
        sleep 1
        COUNT=$((COUNT + 1))
    done

    if [ -f "$TOR_DIR/hostname" ]; then
        HOSTNAME_VAL=$(cat "$TOR_DIR/hostname")
        echo "[ONION] Tor connected"
        echo "[ONION] Onion Service started"
        echo "[ONION] Hostname: $HOSTNAME_VAL"
        if [ "$GENERATE_ONION_KEY" = "true" ] && [ -f "$TOR_DIR/hs_ed25519_secret_key" ]; then
            KEY_BASE64=$(base64 "$TOR_DIR/hs_ed25519_secret_key" | tr -d '\n')
            echo "[ONION] Base64 Encoded Private Key for ONION_PRIVATE_KEY_BASE64 secret:"
            echo "$KEY_BASE64"
        fi
    else
        echo "[ONION] WARNING: Tor started but $TOR_DIR/hostname was not found within $TIMEOUT seconds."
    fi
fi

echo "[DROP] Starting ErikrafT Drop..."
export PORT="$DROP_PORT"
exec npm start
