# Priorities
- ErikrafT Drop™ should be extremely simple, clean, and easy to use.
- The main user flow should never be obstructed!
- New features must be tested thoroughly before we are able to merge them.
- Stability always comes first!

# Agenda
ErikrafT Drop™ is a study in radical simplicity. The user interface is intentionally simple. Features are chosen carefully because each feature can interfere with existing behavior. We focus narrowly on instant file transfer and optimize the main user flow.

# Audit first — do not rebuild existing functionality

This is an existing application. Every human contributor and automated agent/model must inspect the current implementation before changing it.

Follow this order:

1. **Search** for the existing implementation.
2. **Understand** its architecture, behavior, tests and integrations.
3. **Reuse** working components, functions, services and UI.
4. **Correct** incomplete or broken code.
5. **Extend** the existing implementation only where required.
6. **Refactor** only when technically necessary and covered by tests.
7. **Create from scratch** only when the existing implementation is technically unusable or cannot be corrected safely.

A different framework, library, model or personal preference is not sufficient reason to replace working code. Avoid speculative changes, duplicate dependencies, unrelated cleanup and silent scope expansion.

Before implementation, identify what works, what is broken, which files are involved, what must change and what must remain untouched.

# Issues and pull requests

- Check whether a matching Issue or PR already exists.
- Every correction, improvement or feature must use a focused Issue describing the problem/objective, current behavior, expected behavior, scope and acceptance criteria.
- Implement each task in a focused PR that explicitly references its Issue.
- Explain what changed, why, affected files/components, reuse of existing implementation, tests/checks, compatibility impact and risks.
- Do not mix large refactors or unrelated architecture changes into a focused fix.
- Dependency-only updates should normally be handled by the configured dependency automation.

# UI and Motion Principles

Audit existing motion before adding animation. Preserve correct transitions and add loading, progress or asynchronous feedback only where it improves the existing flow. Avoid duplicate or decorative motion, preserve visual identity and respect `prefers-reduced-motion`.

# Observability and quality

Audit existing logs, error reporting, lint, tests and CI before adding tools. Improve the existing solution where possible. Do not add overlapping observability or quality stacks without a demonstrated gap and technical justification.

# Tests and compatibility

For a bug, reproduce or identify the incorrect behavior, fix the existing implementation, add or update focused regression coverage, and run relevant tests and checks.

Consider desktop, mobile, supported browsers, accessibility, performance, loading/error/offline states and asynchronous behavior. Do not break unrelated functionality. Record out-of-scope findings as separate Issues.

# Completion criteria

A task is complete only after the existing implementation has been audited, the smallest safe change has been applied, unrelated behavior has been preserved, tests and relevant checks pass, documentation is updated, and the Issue and PR are linked.

**PROCURE → ENTENDA → REUTILIZE → CORRIJA → ESTENDA → SÓ ENTÃO CRIE.**
