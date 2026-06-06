import { UAParser } from "ua-parser-js";
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
try {
    const ua = new UAParser(userAgent).getResult();
    console.log("UA success:", ua.browser.name);
} catch (e) {
    console.error("UA failure:", e);
}
