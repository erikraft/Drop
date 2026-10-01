# Browser Compatibility and Progressive Enhancement

ErikrafT Drop™ uses a single web application that is progressively enhanced rather than maintaining a separate legacy frontend.

## Strategy

1. **HTML structure** — semantic, readable and usable content is the foundation.
2. **Compatible CSS** — layout, position, spacing and legibility remain predictable when newer CSS is unavailable.
3. **Modern CSS** — modern layout, effects and visual polish enhance the compatible baseline.
4. **Functional JavaScript** — interaction is added without making unrelated UI fail when an optional API is unavailable.
5. **Modern APIs** — WebRTC, WebSocket, PWA and other capabilities are used when supported.
6. **Advanced effects and motion** — visual enhancements are optional and never structural requirements.

## Rules

- Preserve the existing implementation before introducing new abstractions.
- Use feature detection instead of user-agent detection whenever possible.
- Add a fallback only when the missing feature creates a real usability or layout problem.
- Prefer an older declaration before a newer declaration when CSS error handling can provide the fallback.
- Use `@supports` for feature-specific CSS when it makes the fallback clearer or safer.
- Be careful with unsupported selectors: an unsupported selector in a selector list can invalidate the whole rule in older browsers.
- Do not make blur, animation, gradients, transitions or other decorative effects required for readability.
- The Service Worker is an enhancement. The application must remain a normal web application when Service Worker support is unavailable.
- WebRTC and WebSocket are existing transfer/signaling technologies and must not be replaced as part of compatibility work.
- If an API has no safe fallback, isolate the unsupported feature, keep the rest of the UI stable, and communicate the limitation.
- Do not use a browser-specific branch when capability detection can solve the problem.
- Do not add large global polyfills merely to support one optional feature.

## Current audit focus

The main client currently contains modern CSS and JavaScript. Compatibility work must pay particular attention to:

- `:has()` selectors in the main stylesheet;
- CSS functions such as `min()`;
- Flexbox-dependent layout;
- custom properties used throughout the theme/layout;
- modern DOM/API usage in the client scripts;
- WebRTC/WebSocket capability checks;
- Service Worker registration and failure handling;
- WebView limitations;
- reduced-motion behavior.

These findings are an audit focus, not permission to rewrite the affected components. Each change must be verified against the current implementation and kept minimal.

## Degradation model

### Modern browser

HTML → compatible CSS → modern CSS → JavaScript → supported APIs → motion/effects.

Result: the complete ErikrafT Drop™ experience.

### Limited browser

HTML → compatible CSS → supported JavaScript → targeted fallbacks → available functionality.

Result: a simplified but usable experience.

### Unsupported capability

If a capability is genuinely unavailable and cannot be reproduced safely:

- do not throw an unhandled exception;
- do not hide unrelated UI;
- do not break the page shell;
- keep other supported functionality available;
- show a clear limitation only where it is relevant.

## Accessibility and motion

Compatibility changes must preserve keyboard access, focus visibility, readable contrast, semantic structure and non-color-only status communication.

Motion is enhancement. Respect `prefers-reduced-motion` and avoid introducing duplicate animation or loading effects.

## Testing

When a legacy browser is not available, use a combination of:

- static analysis;
- automated tests;
- feature simulation;
- deliberate API absence;
- CSS fallback inspection;
- supported modern-browser verification.

Never document a browser as tested unless it was actually executed.

## Maintenance rule

Future contributors and agents must follow:

**PROCURE → ENTENDA → REUTILIZE → CORRIJA → ESTENDA → SÓ ENTÃO CRIE**

Compatibility must not become a reason to remove modern capabilities or rebuild the frontend. The goal is one implementation that degrades safely and becomes richer as browser capabilities increase.