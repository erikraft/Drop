import assert from "assert";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Polyfill web crypto subtle digest for Node test runner if needed
if (!globalThis.crypto || !globalThis.crypto.subtle) {
    globalThis.crypto = crypto.webcrypto;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qrModulePath = path.join(__dirname, "../public/scripts/erikraft-qr.js");
const {
    ErikrafTQRTransmitter,
    ErikrafTQRScanner,
    crc32,
    sha256Buffer,
    bufferToBase64,
    base64ToBuffer
} = await import(qrModulePath);

async function runTests() {
    console.log("Starting ERIKRAFT-QR Unit Tests...");

    // 1. Test Text Encoding & Recovery with Shuffled / Out-of-Order Frames
    {
        console.log("-> Test 1: Text transfer with shuffled frames");
        const originalText = "Hello, ErikrafT Drop™ QR Optical Transfer Protocol!";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 20 });
        await tx.prepareText(originalText);

        assert(tx.frames.length > 0, "Frames should be generated");
        const frame0 = JSON.parse(tx.frames[0]);
        assert.strictEqual(frame0.h, "EKQR", "Magic header must be EKQR");
        assert.strictEqual(frame0.v, 1, "Version must be 1");
        assert.strictEqual(frame0.t, "text", "Type must be text");

        let completedResult = null;
        const rx = new ErikrafTQRScanner(null, {
            onComplete: (res) => { completedResult = res; }
        });

        rx.start();

        // Feed frames in reverse/shuffled order
        const shuffledFrames = [...tx.frames].reverse();
        for (const frame of shuffledFrames) {
            await rx._processRawData(frame);
        }

        assert(completedResult !== null, "Transfer should complete");
        assert.strictEqual(completedResult.type, "text");
        assert.strictEqual(completedResult.text, originalText, "Reassembled text must match original");
        console.log("   ✓ Text transfer test passed");
    }

    // 2. Test Binary File Transfer Across Exact Boundary Sizes
    {
        console.log("-> Test 2: Binary file transfer across exact boundary sizes");
        const sizesToTest = [1023, 1024, 1025, 2047, 2048, 2049, 10240];

        for (const size of sizesToTest) {
            const randomBuffer = crypto.randomBytes(size).buffer;
            const tx = new ErikrafTQRTransmitter(null, { chunkSize: 180 });
            await tx.prepareFile({
                buffer: randomBuffer,
                name: `test-${size}.bin`,
                type: "application/octet-stream"
            });

            let completedResult = null;
            const rx = new ErikrafTQRScanner(null, {
                onComplete: (res) => { completedResult = res; }
            });
            rx.start();

            for (const frame of tx.frames) {
                await rx._processRawData(frame);
            }

            assert(completedResult !== null, `Transfer for size ${size} should complete`);
            assert.strictEqual(completedResult.name, `test-${size}.bin`);
            assert.strictEqual(completedResult.buffer.byteLength, size, `Byte length must equal ${size}`);

            const origSha = await sha256Buffer(randomBuffer);
            const rxSha = await sha256Buffer(completedResult.buffer);
            assert.strictEqual(rxSha, origSha, `SHA-256 for size ${size} must match original`);
        }
        console.log("   ✓ Binary boundary size tests passed");
    }

    // 3. Test Fountain / FEC Parity Reconstruction (Simulate Missing Base Chunks)
    {
        console.log("-> Test 3: Fountain / FEC Parity reconstruction with lost chunks");
        const binaryData = crypto.randomBytes(2000).buffer;
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 200 });
        await tx.prepareFile({
            buffer: binaryData,
            name: "fec-test.dat",
            type: "application/octet-stream"
        });

        // Drop index 1 base frame, but keep FEC parity frame
        const framesWithLoss = tx.frames.filter(fStr => {
            const parsed = JSON.parse(fStr);
            return !(parsed.i === 1 && !parsed.fec);
        });

        let completedResult = null;
        const rx = new ErikrafTQRScanner(null, {
            onComplete: (res) => { completedResult = res; }
        });
        rx.start();

        for (const frame of framesWithLoss) {
            await rx._processRawData(frame);
        }

        assert(completedResult !== null, "Transfer with 1 lost chunk should recover via FEC");
        const origSha = await sha256Buffer(binaryData);
        const rxSha = await sha256Buffer(completedResult.buffer);
        assert.strictEqual(rxSha, origSha, "Recovered binary hash must match original SHA-256");
        console.log("   ✓ Fountain/FEC parity test passed");
    }

    // 4. Test Corruption Rejection (Corrupted SHA / Bad CRC)
    {
        console.log("-> Test 4: Integrity check failure on corrupted SHA-256");
        const originalText = "Sensitive secret data that must not be corrupted";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 50 });
        await tx.prepareText(originalText);

        // Tamper with the SHA in frame 0
        const parsed0 = JSON.parse(tx.frames[0]);
        parsed0.sha = "0000000000000000000000000000000000000000000000000000000000000000";
        // Recalculate CRC for modified JSON data payload if required, or keep data intact
        tx.frames[0] = JSON.stringify(parsed0);

        let completedResult = null;
        let finalState = "";
        const rx = new ErikrafTQRScanner(null, {
            onStateChange: (st) => { finalState = st; },
            onComplete: (res) => { completedResult = res; }
        });
        rx.start();

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }

        assert.strictEqual(completedResult, null, "Corrupted transfer MUST NOT complete");
        assert.strictEqual(finalState, "Integrity check failed", "State should be 'Integrity check failed'");
        console.log("   ✓ Corruption rejection test passed");
    }

    // 5. Test Duplicate and Out-of-Order Frames
    {
        console.log("-> Test 5: Duplicate and out-of-order frame handling");
        const sampleText = "Duplicate frame tolerance test string for ERIKRAFT-QR Scanner";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 15 });
        await tx.prepareText(sampleText);

        // Duplicate each frame 3 times and scramble order
        const noisyFrames = [];
        for (const f of tx.frames) {
            noisyFrames.push(f, f, f);
        }
        noisyFrames.sort(() => Math.random() - 0.5);

        let completedResult = null;
        const rx = new ErikrafTQRScanner(null, {
            onComplete: (res) => { completedResult = res; }
        });
        rx.start();

        for (const frame of noisyFrames) {
            await rx._processRawData(frame);
        }

        assert(completedResult !== null, "Noisy transfer should complete");
        assert.strictEqual(completedResult.text, sampleText, "Noisy transfer text must match original");
        console.log("   ✓ Duplicate & noisy frames test passed");
    }

    console.log("\nAll ERIKRAFT-QR Unit Tests Passed Successfully!");
}

runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
});
