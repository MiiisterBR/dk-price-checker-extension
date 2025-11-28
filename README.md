# Digikala Price Checker & Reviews

A browser extension that helps users verify Digikala product prices across other popular Iranian marketplaces (Torob and Esam) and view Digikala user reviews directly on those platforms.

## Features

- **Price Comparison on Digikala:**
  - Adds a "Check Other Prices" button on Digikala product pages.
  - Automatically searches for the same product on **Torob** and **Esam**.
  - Displays a modal with price results from other stores.
  - Shows a notification (toast) if a cheaper price is found elsewhere.

- **Review Integration on Other Sites:**
  - Automatically detects product pages on **Torob** and **Esam**.
  - Injects a "View Digikala Reviews" button on these external sites.
  - Fetches and displays Digikala user reviews for the corresponding product without leaving the page.

- **Cross-Browser Support:**
  - Supports Chrome (Manifest V3 Service Worker).
  - Supports Firefox (Manifest V3 Background Scripts).

- **Modern UI:**
  - Uses **Vazirmatn** font for better Persian typography.
  - Clean, responsive modal design.
  - Dark mode support.

## Installation

### Chrome (Developer Mode)
1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click on the **Load unpacked** button.
5. Select the root directory of this project (the folder containing `manifest.json`).

### Firefox (Developer Mode)
1. Clone or download this repository.
2. Open Firefox and enter `about:debugging#/runtime/this-firefox` in the address bar.
3. Click on **Load Temporary Add-on...**.
4. Browse to the project directory and select the `manifest.json` file.

## Build Instructions

**No build step is required.**

This extension is built with vanilla JavaScript, HTML, and CSS. No bundlers (Webpack, Vite, etc.), transpilers (Babel, TypeScript), or minifiers are used.

To package the extension for submission:
1. Zip the contents of the root directory (including `manifest.json`, `src`, and `_locales`).
2. Submit the `.zip` file directly.

## Project Structure

```
/
├── manifest.json       # Extension configuration (MV3)
├── _locales/           # Localization files (en, fa)
├── src/
│   ├── background/
│   │   └── background.js   # Service worker / Background script
│   ├── content/
│   │   ├── content.js      # Content script (UI injection & logic)
│   │   └── content.css     # Styles for injected elements
│   └── assets/
│       ├── icon/           # Extension icons
│       └── fonts/          # Fonts (if local)
└── README.md
```

## Permissions

- `storage`: To save user language preferences.
- `host_permissions`:
  - `*://*.digikala.com/*`: To inject button and fetch reviews.
  - `*://*.torob.com/*`: To inject button on Torob product pages.
  - `*://*.esam.ir/*`: To inject button on Esam product pages.
  - `*://api.torob.com/*` & `*://api.esam.ir/*`: To fetch price data.

## License

MIT License
