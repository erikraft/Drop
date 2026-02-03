# How-To

## Send directly from share menu on iOS
I created a shortcut on iOS to send images, files, folders, URLs, or text directly from the share menu.

To download, go to the link:
https://routinehub.co/shortcut/24753/ or https://www.icloud.com/shortcuts/f81dbac00823445e8feefd0f834b40e7

[//]: # (Todo: Add screenshots)

<br>

## Send directly from share menu on Android
The [Web Share Target API](https://developer.mozilla.org/en-US/docs/Web/Manifest/share_target) is implemented.

When the PWA is installed, it will register itself to the share-menu of the device automatically.

<br>

## Send directly via command-line interface
Send files or text with ErikrafT Drop via command-line interface. \
This opens ErikrafT Drop in the default browser where you can choose the receiver.

### Usage
```bash
erikraftdrop -h
```
```
Send files or text with ErikrafT Drop via command-line interface.
Current domain: https://drop.erikraft.com/

Usage:
Open ErikrafT Drop:		erikraftdrop
Send files:		erikraftdrop file1/directory1 (file2/directory2 file3/directory3 ...)
Send text:		erikraftdrop -t "text"
Specify domain:		erikraftdrop -d "https://drop.erikraft.com/"
Show this help text:	erikraftdrop (-h|--help)

This erikraftdrop-cli version was released alongside v1.10.4
```

<br>

### Setup

#### Linux / Mac
1. Download the latest _erikraftdrop-cli.zip_ from the [releases page](https://github.com/erikraft/Drop/releases/)
   ```shell
   wget "https://github.com/erikraft/Drop/releases/download/v1.12.1/erikraftdrop-cli.zip"
   ```
   or
   ```shell
   curl -LO "https://github.com/erikraft/Drop/releases/download/v1.12.1/erikraftdrop-cli.zip"
   ```
2. Unzip the archive to a folder of your choice e.g. `/usr/share/erikraftdrop-cli/`
   ```shell
   sudo unzip erikraftdrop-cli.zip -d /usr/share/erikraftdrop-cli/
   ```
3. Copy the file _.erikraftdrop-cli-config.example_ to _.erikraftdrop-cli-config_
   ```shell
   sudo cp /usr/share/erikraftdrop-cli/.erikraftdrop-cli-config.example /usr/share/erikraftdrop-cli/.erikraftdrop-cli-config
   ```
4. Make the bash file _erikraftdrop_ executable
   ```shell
   sudo chmod +x /usr/share/erikraftdrop-cli/erikraftdrop
   ```
5. Add a symlink to /usr/local/bin/ to include _erikraftdrop_ to _PATH_
   ```shell
   sudo ln -s /usr/share/erikraftdrop-cli/erikraftdrop /usr/local/bin/erikraftdrop
   ```

<br>

#### Windows
1. Download the latest _erikraftdrop-cli.zip_ from the [releases page](https://github.com/schlagmichdoch/ErikrafTDrop/releases)
2. Put file in a preferred folder e.g. `C:\Program Files\erikraftdrop-cli`
3. Inside this folder, copy the file _.erikraftdrop-cli-config.example_ to _.erikraftdrop-cli-config_
4. Search for and open `Edit environment variables for your account`
5. Click `Environment Variables…`
6. Under _System Variables_ select `Path` and click _Edit..._
7. Click _New_, insert the preferred folder (`C:\Program Files\erikraftdrop-cli`), click *OK* until all windows are closed
8. Reopen Command prompt window

**Requirements**

As Windows cannot execute bash scripts natively, you need to install [Git Bash](https://gitforwindows.org/).

Then, you can also use erikraftdrop-cli from the default Windows Command Prompt
by using the shell file instead of the bash file which then itself executes
_erikraftdrop-cli_ (the bash file) via the Git Bash.
```shell
erikraftdrop.sh -h
```

<br>

## Send multiple files and directories directly from context menu on Windows

### Registering to open files with ErikrafT Drop
It is possible to send multiple files with ErikrafT Drop via the context menu by adding erikraftdrop-cli to Windows `Send to` menu:
1. Download the latest _erikraftdrop-cli.zip_ from the [releases page](https://github.com/erikraft/Drop/releases/)
2. Unzip the archive to a folder of your choice e.g. `C:\Program Files\erikraftdrop-cli\`
3. Inside this folder, copy the file _.erikraftdrop-cli-config.example_ to _.erikraftdrop-cli-config_
4. Copy the shortcut _send with ErikrafT Drop.lnk_
5. Hit Windows Key+R, type: `shell:sendto` and hit Enter.
6. Paste the copied shortcut into the directory
7. Open the properties window of the shortcut and edit the link field to point to _send-with-erikraftdrop.ps1_ located in the folder you used in step 2: \
   `"C:\Program Files\PowerShell\7\pwsh.exe" -File "C:\Program Files\erikraftdrop-cli\send-with-erikraftdrop.ps1"`
8. You are done! You can now send multiple files and directories directly via ErikrafT Drop:

   _context menu_ > _Send to_ > _ErikrafT Drop_

##### Requirements
As Windows cannot execute bash scripts natively, you need to install [Git Bash](https://gitforwindows.org/).

<br>

## Send multiple files and directories directly from context menu on Ubuntu using Nautilus

### Registering to open files with ErikrafT Drop
It is possible to send multiple files with ErikrafT Drop via the context menu by adding erikraftdrop-cli to Nautilus `Scripts` menu:
1. Register _erikraftdrop_ as executable via [guide above](#linux).
2. Copy the shell file _send-with-erikraftdrop_ to `~/.local/share/nautilus/scripts/` to include it in the context menu
   ```shell
   cp /usr/share/erikraftdrop-cli/send-with-erikraftdrop ~/.local/share/nautilus/scripts/
   ```
3. Make the shell file _send-with-erikraftdrop_ executable
   ```shell
   chmod +x ~/.local/share/nautilus/scripts/send-with-erikraftdrop
   ```
4. You are done! You can now send multiple files and directories directly via ErikrafT Drop:

   _context menu_ > _Scripts_ > _send-with-erikraftdrop_

<br>

## File Handling API
The [File Handling API](https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/handle-files)
was implemented, but it was removed as default file associations were overwritten ([#17](https://github.com/schlagmichdoch/PairDrop/issues/17),
[#116](https://github.com/schlagmichdoch/PairDrop/issues/116) [#190](https://github.com/schlagmichdoch/PairDrop/issues/190))
and it only worked with explicitly specified file types and couldn't handle directories at all.

[< Back](/README.md)
