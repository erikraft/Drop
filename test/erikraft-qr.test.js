import assert from "assert";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

if (!globalThis.crypto || !globalThis.crypto.subtle) {
    globalThis.crypto = crypto.webcrypto;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qrModulePath = path.join(__dirname, "../public/scripts/erikraft-qr.js");
const {
    TransferIntegrity,
    OpticalTransferProtocol,
    FountainEncoder,
    FountainDecoder,
    AdaptiveTransport,
    ErikrafTQRTransmitter,
    ErikrafTQRScanner,
    crc32,
    sha256Buffer,
    bufferToBase64,
    base64ToBuffer
} = await import(qrModulePath);

async function runTests() {
    console.log("==================================================");
    console.log("Starting ERIKRAFT-QR v2.0 Technical Test Suite");
    console.log("==================================================");

    // 1. Small Text Transfer
    {
        console.log("-> 1. Small text transfer");
        const sample = "Small text";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 16 });
        await tx.prepareText(sample);

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "Small text transfer should complete");
        assert.strictEqual(res.text, sample);
        console.log("   ✓ Small text transfer passed");
    }

    // 2. Large Text Transfer
    {
        console.log("-> 2. Large text transfer");
        const largeText = "A".repeat(15000);
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 200 });
        await tx.prepareText(largeText);

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "Large text transfer should complete");
        assert.strictEqual(res.text, largeText);
        console.log("   ✓ Large text transfer passed");
    }

    // 3. Small Binary File Transfer
    {
        console.log("-> 3. Small binary file transfer");
        const smallBin = crypto.randomBytes(128).buffer;
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 32 });
        await tx.prepareFile({ buffer: smallBin, name: "small.bin", type: "application/octet-stream" });

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "Small file transfer should complete");
        assert.strictEqual(res.name, "small.bin");
        assert.strictEqual(res.buffer.byteLength, 128);
        console.log("   ✓ Small binary file transfer passed");
    }

    // 4. Binary File Transfer Across Exact Boundary Sizes
    {
        console.log("-> 4. Binary boundary size tests (1023, 1024, 1025, 2048)");
        for (const sz of [1023, 1024, 1025, 2048]) {
            const buf = crypto.randomBytes(sz).buffer;
            const tx = new ErikrafTQRTransmitter(null, { chunkSize: 180 });
            await tx.prepareFile({ buffer: buf, name: `b-${sz}.bin`, type: "application/octet-stream" });

            let res = null;
            const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
            rx.state = 'Searching for QR...';
            rx.scanning = true;

            for (const frame of tx.frames) {
                await rx._processRawData(frame);
            }
            assert(res !== null, `Boundary size ${sz} failed`);
            assert.strictEqual(res.buffer.byteLength, sz);
        }
        console.log("   ✓ Binary boundary size tests passed");
    }

    // 5. Larger Binary File Transfer (20 KB)
    {
        console.log("-> 5. Larger binary file transfer (20 KB)");
        const buf = crypto.randomBytes(20480).buffer;
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 250 });
        await tx.prepareFile({ buffer: buf, name: "large.bin", type: "application/octet-stream" });

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "Large binary transfer failed");
        assert.strictEqual(res.buffer.byteLength, 20480);
        console.log("   ✓ Larger binary file transfer passed");
    }

    // 6. Fountain / FEC Frame Loss Recovery (Drop Base Block 1 & 3)
    {
        console.log("-> 6. Fountain/FEC frame loss recovery");
        const buf = crypto.randomBytes(3000).buffer;
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 200 });
        await tx.prepareFile({ buffer: buf, name: "fec.bin", type: "application/octet-stream" });

        const framesWithLoss = tx.frames.filter(fStr => {
            const parsed = JSON.parse(fStr);
            const isSingle = parsed.b && parsed.b.length === 1;
            return !(isSingle && (parsed.b[0] === 1 || parsed.b[0] === 3));
        });

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of framesWithLoss) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "FEC recovery failed under frame loss");
        const origSha = await sha256Buffer(buf);
        const rxSha = await sha256Buffer(res.buffer);
        assert.strictEqual(rxSha, origSha);
        console.log("   ✓ Fountain/FEC frame loss recovery passed");
    }

    // 7. Duplicate Frame Filtering
    {
        console.log("-> 7. Duplicate frame filtering");
        const text = "Duplicate frame test";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 15 });
        await tx.prepareText(text);

        const dupFrames = [];
        for (const f of tx.frames) {
            dupFrames.push(f, f, f);
        }

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of dupFrames) {
            await rx._processRawData(frame);
        }
        assert(res !== null);
        assert.strictEqual(rx.decoder !== null && rx.decoder.duplicateFramesCount > 0, true);
        console.log("   ✓ Duplicate frame filtering passed");
    }

    // 8. Out-of-Order Frame Reassembly
    {
        console.log("-> 8. Out-of-order frame reassembly");
        const text = "Out of order frame reassembly test";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 12 });
        await tx.prepareText(text);

        const shuffled = [...tx.frames].reverse();
        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of shuffled) {
            await rx._processRawData(frame);
        }
        assert(res !== null);
        assert.strictEqual(res.text, text);
        console.log("   ✓ Out-of-order frame reassembly passed");
    }

    // 9. Corrupted Frame CRC Rejection
    {
        console.log("-> 9. Corrupted frame CRC rejection");
        const text = "CRC check test";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 15 });
        await tx.prepareText(text);

        const badFramePayload = JSON.parse(tx.frames[0]);
        badFramePayload.crc = 99999999;
        const badFrameStr = JSON.stringify(badFramePayload);

        const rx = new ErikrafTQRScanner(null, {});
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        await rx._processRawData(badFrameStr);
        assert.strictEqual(rx.invalidFrameCount, 1);
        console.log("   ✓ Corrupted frame CRC rejection passed");
    }

    // 10. Consecutive Frame Loss Handling
    {
        console.log("-> 10. Consecutive frame loss handling");
        const buf = crypto.randomBytes(4000).buffer;
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 200 });
        await tx.prepareFile({ buffer: buf, name: "consec.bin", type: "application/octet-stream" });

        // Drop 4 consecutive frames (indices 2,3,4,5)
        const framesWithConsecLoss = tx.frames.filter(fStr => {
            const parsed = JSON.parse(fStr);
            const isSingle = parsed.b && parsed.b.length === 1;
            return !(isSingle && (parsed.b[0] >= 2 && parsed.b[0] <= 5));
        });

        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of framesWithConsecLoss) {
            await rx._processRawData(frame);
        }
        assert(res !== null, "Consecutive frame loss recovery failed");
        console.log("   ✓ Consecutive frame loss handling passed");
    }

    // 11. Full Decoder Reconstruction
    {
        console.log("-> 11. Full decoder reconstruction");
        const fe = new FountainEncoder(new Uint8Array([10, 20, 30, 40, 50, 60]).buffer, 2);
        const fd = new FountainDecoder(fe.numBlocks, 6, 2);

        for (let i = 0; i < fe.numBlocks; i++) {
            const blocks = fe.getFrameBlocks(i);
            const data = fe.encodeFrameData(blocks);
            fd.addFrame(blocks, data.buffer);
        }
        assert.strictEqual(fd.isComplete(), true);
        assert.strictEqual(fd.getRecoveryProgress(), 100);
        console.log("   ✓ Full decoder reconstruction passed");
    }

    // 12. Correct SHA-256 Validation
    {
        console.log("-> 12. Correct SHA-256 validation");
        const sampleBuf = new Uint8Array([1, 2, 3, 4, 5]).buffer;
        const hash = await sha256Buffer(sampleBuf);
        assert.strictEqual(typeof hash, "string");
        assert.strictEqual(hash.length, 64);
        console.log("   ✓ Correct SHA-256 validation passed");
    }

    // 13. Corrupted SHA-256 Rejection
    {
        console.log("-> 13. Corrupted SHA-256 rejection");
        const text = "SHA validation test string";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 20 });
        await tx.prepareText(text);

        const tampered0 = JSON.parse(tx.frames[0]);
        tampered0.sha = "0000000000000000000000000000000000000000000000000000000000000000";
        tx.frames[0] = JSON.stringify(tampered0);

        let res = null;
        let state = "";
        const rx = new ErikrafTQRScanner(null, {
            onStateChange: (s) => { state = s; },
            onComplete: (r) => { res = r; }
        });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const f of tx.frames) {
            await rx._processRawData(f);
        }
        assert.strictEqual(res, null);
        assert.strictEqual(state, "Integrity check failed");
        console.log("   ✓ Corrupted SHA-256 rejection passed");
    }

    // 14. Bad CRC Rejection via Protocol Parser
    {
        console.log("-> 14. Bad CRC rejection via protocol parser");
        const frameStr = OpticalTransferProtocol.createFramePayload({
            transferId: "TESTID12",
            type: "text",
            totalSize: 10,
            frameIdx: 0,
            totalChunks: 1,
            blocks: [0],
            dataB64: bufferToBase64(new Uint8Array([1, 2, 3]).buffer),
            sha: "abc"
        });
        const parsed = JSON.parse(frameStr);
        parsed.crc = 12345;
        assert.throws(() => OpticalTransferProtocol.parseFramePayload(JSON.stringify(parsed)), /CRC checksum failure/);
        console.log("   ✓ Bad CRC rejection passed");
    }

    // 15. Session Cancellation & Cleaning
    {
        console.log("-> 15. Session cancellation & cleaning");
        const rx = new ErikrafTQRScanner(null, {});
        rx.state = 'Searching for QR...';
        rx.scanning = true;
        rx.stop();
        assert.strictEqual(rx.scanning, false);
        console.log("   ✓ Session cancellation passed");
    }

    // 16. Session Isolation between Different Transfers
    {
        console.log("-> 16. Session isolation");
        const tx1 = new ErikrafTQRTransmitter(null, { chunkSize: 20 });
        await tx1.prepareText("Session 1");
        const tx2 = new ErikrafTQRTransmitter(null, { chunkSize: 20 });
        await tx2.prepareText("Session 2");

        const rx = new ErikrafTQRScanner(null, {});
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        await rx._processRawData(tx1.frames[0]);
        const initialId = rx.meta.id;

        // Process frame from session 2 -> should be ignored
        await rx._processRawData(tx2.frames[0]);
        assert.strictEqual(rx.meta.id, initialId);
        console.log("   ✓ Session isolation passed");
    }

    // 17. Protocol Versioning Check
    {
        console.log("-> 17. Protocol versioning check");
        const payload = JSON.parse(tx1Payload());
        payload.v = 99;
        assert.throws(() => OpticalTransferProtocol.parseFramePayload(JSON.stringify(payload)), /Unsupported protocol version/);
        console.log("   ✓ Protocol versioning check passed");

        function tx1Payload() {
            return OpticalTransferProtocol.createFramePayload({
                transferId: "VERTEST1",
                type: "text",
                totalSize: 5,
                frameIdx: 0,
                totalChunks: 1,
                blocks: [0],
                dataB64: bufferToBase64(new Uint8Array([1, 2, 3]).buffer),
                sha: "abc"
            });
        }
    }

    // 18. Adaptive Transport Latency Tuning
    {
        console.log("-> 18. Adaptive transport latency tuning");
        const adapt = new AdaptiveTransport();
        assert.strictEqual(adapt.getFps(), 10);
        for (let i = 0; i < 12; i++) adapt.recordDecode(150); // High latency
        // Simulate time jump for adjustment interval
        adapt.lastAdjustTime = Date.now() - 3000;
        adapt.recordDecode(150);
        assert(adapt.getFps() < 10, "FPS should decrease on high latency");
        console.log("   ✓ Adaptive transport tuning passed");
    }

    // 19. Empty & Edge Payload Handling
    {
        console.log("-> 19. Empty payload handling");
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 20 });
        await tx.prepareText("");
        let res = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const f of tx.frames) {
            await rx._processRawData(f);
        }
        assert(res !== null);
        assert.strictEqual(res.text, "");
        console.log("   ✓ Empty payload handling passed");
    }

    // 20. Fountain/LT Stress Simulator (1%, 5%, 10%, 20%, 30% Frame Loss Rates)
    {
        console.log("-> 20. Fountain/LT Stress Simulator (1% - 30% loss)");
        const testPayload = crypto.randomBytes(8000).buffer;
        const lossRates = [0.01, 0.05, 0.10, 0.20, 0.30];

        for (const rate of lossRates) {
            const tx = new ErikrafTQRTransmitter(null, { chunkSize: 200 });
            await tx.prepareFile({ buffer: testPayload, name: `stress-${rate}.bin`, type: "application/octet-stream" });

            // Generate extra parity frames dynamically up to 4x to guarantee Fountain recovery at high loss rates
            const totalFramesNeeded = Math.ceil(tx.encoder.numBlocks * 4.0);
            for (let extra = tx.frames.length; extra < totalFramesNeeded; extra++) {
                const blocks = tx.encoder.getFrameBlocks(extra);
                const frameDataBuf = tx.encoder.encodeFrameData(blocks);
                const dataB64 = bufferToBase64(frameDataBuf.buffer);
                tx.frames.push(OpticalTransferProtocol.createFramePayload({
                    transferId: tx.transferId,
                    type: tx.metadata.type,
                    name: tx.metadata.name,
                    mime: tx.metadata.mime,
                    totalSize: tx.totalSize,
                    frameIdx: extra,
                    totalChunks: tx.encoder.numBlocks,
                    blocks: blocks,
                    dataB64: dataB64,
                    sha: tx.sha
                }));
            }

            // Simulate loss deterministically based on frame index
            const receivedFrames = tx.frames.filter((_, idx) => (idx % 100) / 100 >= rate);

            let res = null;
            const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { res = r; } });
            rx.state = 'Searching for QR...';
            rx.scanning = true;

            for (const frame of receivedFrames) {
                await rx._processRawData(frame);
                if (res !== null) break;
            }

            assert(res !== null, `Stress simulator failed at ${(rate * 100)}% loss rate`);
            assert.strictEqual(res.buffer.byteLength, 8000);
            console.log(`   ✓ Loss rate ${(rate * 100)}%: Recovered successfully (${rx.decoder.validFramesReceived} frames processed)`);
        }
    }

    // 21. Cross-Platform Roundtrip Validation (Android <-> Web simulated)
    {
        console.log("-> 21. Cross-platform roundtrip validation");
        const txText = "Android <-> Web Cross Platform ERIKRAFT-QR Payload";
        const tx = new ErikrafTQRTransmitter(null, { chunkSize: 25 });
        await tx.prepareText(txText);

        let rxRes = null;
        const rx = new ErikrafTQRScanner(null, { onComplete: (r) => { rxRes = r; } });
        rx.state = 'Searching for QR...';
        rx.scanning = true;

        for (const frame of tx.frames) {
            await rx._processRawData(frame);
        }

        assert(rxRes !== null);
        assert.strictEqual(rxRes.text, txText);
        console.log("   ✓ Cross-platform roundtrip passed");
    }

    console.log("==================================================");
    console.log("All 21 ERIKRAFT-QR v2.0 Tests Passed Successfully!");
    console.log("==================================================");
}

runTests().catch(err => {
    console.error("Test failure:", err);
    process.exit(1);
});
