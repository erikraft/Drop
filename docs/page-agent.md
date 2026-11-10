# Page Agent in ErikrafT Drop™

Page Agent is an optional AI-assisted automation integration. It is not required for device discovery or file transfers.

## Availability

The integration is exposed by the ErikrafT Drop™ web interface. Its behavior depends on the browser, the configured model/provider, and the external Page Agent library.

## Page Agent Ext

The companion extension may provide authentication and additional features. Its authentication token is stored in the browser's local storage. Do not include this token in screenshots, logs, issue reports, or support messages.

## Quick actions

ErikrafT Drop™ provides interface controls to start the integration. The external Page Agent library performs page interpretation and automation; the Drop transfer server does not implement the model or the agent's action planner.

## LLM configuration

The user configures the model and API key in the Page Agent flow. The session API key held by the Drop integration remains in memory for the session; the Drop code does not write it to a database.

Review the selected provider's retention, privacy, billing, and data-use policies. Model usage costs are charged by the provider/account configured by the user.

## CDN and software supply chain

The integration loads the Page Agent library from an external CDN and has an alternate source. This code runs in the Drop page context and must be treated as a third-party dependency with access to the page interface and browser storage.

Use the integration only when you trust the library and provider. Do not enter permanent keys or credentials that must not be accessible to scripts running in the page.

## Prompt injection and permissions

External pages may contain malicious instructions intended to influence AI agents. Review suggested actions before allowing the agent to click, navigate, submit content, or change data on external pages. The Drop repository does not control the remote model and cannot verify the Page Agent library's internal prompt-injection defenses.

## Privacy

Page Agent is optional. The Drop transfer server does not automatically receive the contents of every page visited by the user; what the agent reads or sends depends on the external library, model, and actions authorized in the session.

## Credits and licensing

Check the official Page Agent and companion-extension documentation and licenses before redistributing or modifying those components.
