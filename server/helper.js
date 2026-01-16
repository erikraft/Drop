/**
 * ErikrafT Drop - Helper Utilities
 *
 * This module provides secure hashing and randomization functions
 * for internal pairing operations (NOT for user passwords).
 */

import crypto from "crypto";

// ============================================================================
// HASHER MODULE
// Secure hash functions for internal pairing token derivation
// ============================================================================
export const hasher = (() => {
    let internalSalt = null;

    /**
     * Generates a secure hash for pairing token derivation.
     * Combines a process-wide internal salt with the provided salt.
     *
     * @param {string} salt - External salt for additional entropy
     * @returns {string} Hex-encoded hash (128 chars = 512 bits)
     */
    function hashCodeSalted(salt) {
        // Generate internal salt once per process lifetime
        if (!internalSalt) {
            internalSalt = randomizer.getRandomString(64);
        }

        // Use SHA3-512 for secure internal hashing
        // Combines internal process-wide salt with provided salt for derivation
        // This is appropriate for pairing token generation (not user passwords)
        const hash = crypto.createHash("sha3-512");
        hash.update(internalSalt);
        hash.update(crypto.createHash("sha3-512").update(salt, "utf8").digest("hex"));
        return hash.digest("hex");
    }

    return {
        hashCodeSalted
    };
})();

// ============================================================================
// RANDOMIZER MODULE
// Cryptographically secure random string generation
// ============================================================================
export const randomizer = (() => {
    /**
     * Checks if character code is an uppercase letter (A-Z).
     * @param {number} code - Character code
     * @returns {boolean}
     */
    const isUppercaseLetter = (code) => code >= 65 && code <= 90;

    /**
     * Checks if character code is a "safe" printable character.
     * Safe chars: 0-9, A-Z, a-z, underscore, hyphen
     * @param {number} code - Character code
     * @returns {boolean}
     */
    const isSafeChar = (code) =>
        (code >= 48 && code <= 57) ||   // 0-9
        (code >= 65 && code <= 90) ||   // A-Z
        (code >= 97 && code <= 122) ||  // a-z
        code === 45 ||                  // -
        code === 95;                    // _

    return {
        /**
         * Generates a cryptographically secure random string.
         * Uses Web Crypto API for cryptographically strong random values.
         *
         * @param {number} length - Desired length of the string
         * @param {boolean} [lettersOnly=false] - If true, only uppercase letters (A-Z)
         * @returns {string} Random string of specified length
         */
        getRandomString(length, lettersOnly = false) {
            const condition = lettersOnly ? isUppercaseLetter : isSafeChar;
            let result = "";

            while (result.length < length) {
                // Generate random bytes using Web Crypto API
                const buffer = new Uint8Array(length);
                crypto.webcrypto.getRandomValues(buffer);

                // Filter and append valid characters
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

// ============================================================================
// CYRB53 MODULE
// Fast non-cryptographic hash function
//
// Original author: bryc (github.com/bryc)
// License: Public domain
//
// Note: This is NOT cryptographically secure.
// Use hasher for security-critical operations.
// ============================================================================

/**
 * A fast and simple hash function with decent collision resistance.
 * Inspired by MurmurHash2/3, optimized for speed/simplicity.
 *
 * @param {string} str - String to hash
 * @param {number} [seed=0] - Optional seed for incremental hashing
 * @returns {number} 32-bit hash value
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

