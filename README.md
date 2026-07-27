**English** | [中文文档](docs/zh-CN/README.md)

---

# Lan Share

> A LAN file, text, and image sharing tool for Windows, macOS, and Linux. Once running on your computer, any device on the same local network can view and download shared content using a modern browser.

![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Tauri](https://img.shields.io/badge/Tauri-2-ffc131?logo=tauri&logoColor=black)
![License](https://img.shields.io/badge/license-MIT-green)

![Home Page Preview](docs/img/preview-home.png)

## How It Works

Lan Share turns your computer into a mini file server on your local network. Any device connected to the same Wi-Fi — phone, tablet, laptop, TV — can open a browser and access your shared files. Everything stays on your network, nothing goes to the cloud.

## Quick Start

1. **Download** the latest version for your system from [Releases](https://github.com/SomunsMo/lan-share/releases)
2. **Install and open** Lan Share
3. **Pick a folder to share** in the Settings page
4. **Scan the QR code** on the home page, or type the address (like `http://192.168.x.x:6633`) into another device's browser

That's it — you're sharing.

## Features

### File Sharing
- Browse and download files from the shared folder on any device
- Upload files or entire folders through the browser
- Rename and delete files (optional — enable in Settings)
- Drag-and-drop file upload support

### Text & Image Sharing
- Type or paste text on your computer, read it from any other device
- Share images from clipboard directly — no file saving needed
- View shared text and image history on both desktop and web

### Transfer Log
- Complete history of every file, text, and image shared
- Filter by type (text/file/image), search by content, sort by time
- Track copy and download events

### Customizable
- **Light / Dark** theme — set independently for desktop and web
- **Accent color** — pick any color with the HSL picker
- **Port** — change the HTTP port freely (default 6633)

### Internationalization
- **Chinese and English** — switch anytime in Settings, or let it auto-detect your system language
- Desktop UI and web UI are both fully translated

### Security You Control
- Files outside the shared folder are never accessible
- Every operation (upload, rename, delete, overwrite) is **disabled by default** — you decide what to allow
- Deleted files go to the recycle bin (optional)
- Dangerous filenames and path traversal attacks are blocked automatically
- Built-in and custom file exclusion rules

### Cross-Platform
- **Windows, macOS, and Linux** — the desktop app runs on all three with the same experience
- System tray for quick access
- Optional autostart on login (with minimized to tray)

## FAQ

| Question | Answer |
|----------|--------|
| Do I need an internet connection | No. Everything works over your local network only |
| Which devices can access my files | Any device with a browser — phones, tablets, laptops, smart TVs. No app installation needed |
| Is my data safe | Your data never leaves your local network. The HTTP server is only reachable from within your LAN |
| Can I share multiple folders | Currently, one shared folder at a time. You can change it anytime in Settings |
| Where can I report issues | Open an issue on [GitHub](https://github.com/SomunsMo/lan-share/issues) |

## For Developers

See the [Development Guide](docs/development.md) for technical architecture, API documentation, build instructions, and contribution guidelines.

## License

MIT
