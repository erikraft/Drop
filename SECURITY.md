# Security Policy

## Supported Versions

ErikrafT Drop™ follows a rolling security-support policy. The **latest released version** is the primary supported version for security fixes.

| Version | Support Status |
| --- | --- |
| **10.1.x** | ✅ Supported |
| 10.0.x and older | ⚠️ Upgrade recommended / not guaranteed |

> **Current release:** `v10.1.5`
>
> Security fixes may require users to update to the latest release. Older releases are not guaranteed to receive backported fixes.

## Reporting a Vulnerability

If you discover a security vulnerability in **ErikrafT Drop™**, please report it privately and responsibly. Do not disclose the vulnerability publicly before the maintainers have had a reasonable opportunity to investigate and release a fix.

### Security contact

- **Email:** [contact+security@erikraft.com](mailto:contact+security@erikraft.com)
- **Discord:** use the `#ticket` channel at [discord.erikraft.com](https://discord.erikraft.com/)

Please use the email channel whenever the report contains sensitive technical details, exploit information, credentials, private data, or other information that should not be posted publicly.

### Information to include

When possible, include:

- A clear description of the vulnerability.
- The affected ErikrafT Drop™ version, browser, operating system, and device information when relevant.
- Steps to reproduce the issue.
- The expected and actual behavior.
- The potential security impact and attack scenario.
- A minimal proof of concept (PoC), if available and safe to provide.
- Relevant logs, screenshots, URLs, or files that help reproduce the issue. Remove secrets and personal information before sending them.
- Whether the vulnerability is reproducible in the latest release.

### Response and disclosure

We aim to acknowledge security reports within **5 business days** and will investigate reports as promptly as reasonably possible.

Please allow reasonable time for investigation, remediation, testing, and deployment before making vulnerability details public. We may request additional information during the investigation.

We do not require a specific disclosure format, and reports will be evaluated based on their technical impact and reproducibility.

## Scope and Security Considerations

ErikrafT Drop™ provides peer-to-peer file and data transfer through the web application and companion clients. Security reports involving the following areas are especially valuable:

- Cross-site scripting (XSS), HTML injection, or unsafe rendering of peer-supplied content.
- URL, redirect, phishing, or protocol-bypass vulnerabilities.
- Malicious or unsafe file handling.
- QR-code scanning, QR payload validation, or transfer integrity.
- Authentication, pairing, discovery, or unauthorized peer interaction.
- WebChat message and attachment handling.
- Service Worker, PWA, caching, or offline-security issues.
- Client-side security controls that can be bypassed to execute unintended actions.
- Security-sensitive WebView or native-bridge interactions in the Android client.
- Native Android file handling, storage access, intents, notifications, and background services.
- FTP/FTPS server configuration or unauthorized access issues in the Android client.
- Tor/.onion connectivity or proxy handling when a vulnerability can affect confidentiality, integrity, or authorization.

### Out of scope

Reports that do not demonstrate a security impact may be treated as general bugs rather than security vulnerabilities. Automated scans without a reproducible security impact, dependency notices without an exploitable path, and purely cosmetic issues are generally not considered security vulnerabilities.

## Responsible Disclosure

Please avoid accessing, modifying, deleting, or exposing data that does not belong to you. Do not perform denial-of-service attacks, social engineering, spam, or actions that could disrupt users or infrastructure while testing a vulnerability.

If testing requires interaction with another user, use accounts and devices that you control and keep the test environment isolated whenever possible.

Thank you for helping keep **ErikrafT Drop™** secure, private, and reliable.
