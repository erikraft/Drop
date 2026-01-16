import crypto from "crypto";

/**
 * Pairing token derivation
 * Used for temporary device pairing (NOT a password)
 */
export const pairing = (() => {
    let pairSecret;

    return {
        derivePairToken(context) {
            if (!pairSecret) {
                // Secret generated once per process
                pairSecret = randomizer.getRandomString(128);
            }

            return crypto
                .createHash("sha256")
                .update(pairSecret)
                .update(context, "utf8")
                .digest("hex");
        }
    };
})();

/**
 * Secure random string generator
 */
export const randomizer = (() => {
    const charCodeLettersOnly = r => r >= 65 && r <= 90; // A-Z

    const charCodeSafe = r =>
        (r >= 48 && r <= 57) ||   // 0-9
        (r >= 65 && r <= 90) ||   // A-Z
        (r >= 97 && r <= 122) ||  // a-z
        r === 45 ||               // -
        r === 95;                 // _

    return {
        getRandomString(length, lettersOnly = false) {
            const condition = lettersOnly ? charCodeLettersOnly : charCodeSafe;
            let result = "";

            while (result.length < length) {
                const buffer = new Uint8Array(length);
                crypto.webcrypto.getRandomValues(buffer);

                for (const value of buffer) {
                    if (condition(value)) {
                        result += String.fromCharCode(value);
                        if (result.length >= length) break;
                    }
                }
            }

            return result;
        }
    };
})();

/*
    cyrb53 (c) 2018 bryc (github.com/bryc)
    A fast and simple hash function with decent collision resistance.
    Public domain. Attribution appreciated.
*/
export const cyrb53 = function (str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;

    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 =
        Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
        Math.imul(h2 ^ (h2 >>> 13), 3266489909);

    h2 =
        Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
        Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};
