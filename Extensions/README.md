# Extensions

This directory contains information and resources for various extensions including Browser Extensions, Open VSX Registry Extensions, and VS Code Extensions.

## ErikrafT Drop Extension

### Download Links

<a href="https://marketplace.visualstudio.com/items?itemName=ErikrafT.erikraft-drop" target="_blank">
  <img alt="Get it on VS Code Marketplace" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20VS%20CODE.png">
</a>
<a href="https://open-vsx.org/extension/ErikrafT/erikraft-drop" target="_blank">
  <img alt="Get it on Open VSX Registry" style="height: 80px;" src="./public/images/badges/Get%20it%20on%20Open%20VSX%20Registry.png">
</a>
<a href="https://addons.opera.com/en/extensions/details/erikraft-drop/" target="_blank">
  <img alt="Opera Add-ons" style="height: 80px;" src="./public/images/badges/Get-it-from-Opera-Addons.png">
</a>
<a href="https://addons.mozilla.org/pt-BR/firefox/addon/erikraft-drop/" target="_blank">
  <img alt="Firefox Browser ADD-ONS" style="height: 80px;" src="./public/images/badges/Firefox%20Browser%20ADD-ONS.png">
</a>

### Extension Platforms
- **VS Code Marketplace**: [ErikrafT.erikraft-drop](https://marketplace.visualstudio.com/items?itemName=ErikrafT.erikraft-drop)
- **Open VSX Registry**: [ErikrafT/erikraft-drop](https://open-vsx.org/extension/ErikrafT/erikraft-drop)
- **Opera Add-ons**: [ErikrafT Drop](https://addons.opera.com/en/extensions/details/erikraft-drop/)
- **Firefox Browser ADD-ONS**: [ErikrafT Drop](https://addons.mozilla.org/pt-BR/firefox/addon/erikraft-drop/)

## Browser Extensions

Browser extensions enhance your web browsing experience by adding new features and functionality to your web browser.

### Popular Browser Extensions

#### Google Chrome Extensions
- **Download**: [Chrome Web Store](https://chrome.google.com/webstore)
- **Development**: [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions)

#### Mozilla Firefox Extensions
- **Download**: [Firefox Browser ADD-ONS](https://addons.mozilla.org/firefox/)
- **Development**: [Firefox Extension Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

#### Microsoft Edge Extensions
- **Download**: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons)
- **Development**: [Edge Extension Documentation](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/)

## Open VSX Registry Extensions

The Open VSX Registry is an open-source alternative to the Visual Studio Code Marketplace, providing a platform for publishing and discovering VS Code extensions.

### Resources
- **Registry**: [Open VSX Registry](https://open-vsx.org/)
- **Publish Extensions**: [Open VSX Publishing Guide](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
- **API Documentation**: [Open VSX API](https://open-vsx.org/api)

### Publishing to Open VSX
```bash
# Install the publishing tool
npm install -g ovsx

# Login and publish
ovsx login
ovsx publish
```

## VS Code Extensions

Visual Studio Code extensions add new capabilities to the VS Code editor, including language support, themes, debuggers, and more.

### Extension Marketplace
- **Download**: [VS Code Marketplace](https://marketplace.visualstudio.com/VSCode)
- **Development**: [VS Code Extension API](https://code.visualstudio.com/api)

### Creating VS Code Extensions

#### Prerequisites
- Node.js and npm
- Yeoman and VS Code Extension Generator
- VS Code with Extension Development Host

#### Setup
```bash
# Install Yeoman and VS Code Extension Generator
npm install -g yo generator-code

# Generate a new extension
yo code
```

#### Extension Types
1. **Language Extensions** - Add support for new programming languages
2. **Debuggers** - Add debugging capabilities
3. **Themes** - Customize the editor appearance
4. **Snippets** - Add code snippets for faster development
5. **Linters** - Add code quality checking
6. **Formatters** - Add code formatting capabilities

### Popular Extension Categories
- **Productivity**: Tools to enhance coding efficiency
- **Language Support**: Extensions for specific programming languages
- **Themes**: Color schemes and visual customizations
- **Debugging**: Enhanced debugging tools
- **Source Control**: Git and version control integrations
- **Testing**: Unit testing and test runner integrations

## Installation Instructions

### Browser Extensions
1. Visit the respective extension store
2. Search for the desired extension
3. Click "Add to Browser" or "Install"
4. Grant necessary permissions

### VS Code Extensions
```bash
# Install from command line
code --install-extension <extension-id>

# Install from VS Code
1. Open Extensions view (Ctrl+Shift+X)
2. Search for the extension
3. Click Install
```

## Development Resources

### Browser Extension Development
- [Chrome Extension Getting Started](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
- [Firefox Extension Tutorial](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension)

### VS Code Extension Development
- [VS Code Extension API Reference](https://code.visualstudio.com/api/references/vscode-api)
- [Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Extension Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Security Considerations

- Only install extensions from trusted sources
- Review permissions before installation
- Keep extensions updated
- Monitor extension behavior for unusual activity
- Use official marketplaces when possible

## Support

For issues related to specific extensions, please refer to:
- Extension documentation
- Developer support channels
- Community forums
- Issue trackers on respective repositories
