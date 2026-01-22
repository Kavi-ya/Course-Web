# SliitScope v2.1

A clean, modern Chrome extension for SLIIT students that declutters your Courseweb dashboard. Now faster, more reliable, and beautiful in Dark Mode.

---

## What's New in v2.1
*   **Robust Data Fetching:** We now use the official Moodle API to fetch your courses. No more broken lists when the website layout changes!
*   **Modern Dark Theme:** Experience Courseweb in a stunning new dark mode with glassmorphism effects.
*   **Smart Grouping:** Automatically groups courses by semester, handling the latest course naming formats (e.g., `[2024/JUL]`).

---

## Features

*   **🔍 Instant Search:** Find any module instantly with the search bar.
*   **🌑 Modern Dark Mode:** Toggle a premium dark theme for the entire Courseweb site directly from the popup.
*   **📂 Smart Grouping:** Courses are automatically organized by semester/intake.
*   **👁️ Hide/Show:** Toggle visibility of any module on your dashboard.
*   **☁️ Auto-Sync:** Preferences are saved to your Chrome profile and sync across devices.
*   **🚀 One-click Reset:** "Show All" button to instantly restore all courses.
*   **⚡ Lightweight:** Runs only on Courseweb, protecting your privacy.

---

## Screenshots

### Dark Theme
![Dark Theme](https://github.com/Kavi-ya/Course-Web/blob/main/Screenshots/Dark%20Theme.png)

### Light Theme
![Light Theme](https://github.com/Kavi-ya/Course-Web/blob/main/Screenshots/Light%20Theme.png)

---

## Installation

1.  Clone or download this repository.
2.  Go to `chrome://extensions/` in your browser.
3.  Enable **“Developer mode”** (toggle in top-right).
4.  Click **“Load unpacked”** and select this folder.
5.  Pin **SliitScope** to your toolbar.
6.  Visit [courseweb.sliit.lk/my/courses.php](https://courseweb.sliit.lk/my/courses.php) and enjoy!

---

## Usage

1.  **Organize:** Open the popup to see all your courses.
2.  **Hide:** Click "Hide" next to old or irrelevant courses. They will vanish from your dashboard cards.
3.  **Theme:** Click the 🌙 icon in the popup header to switch to the new Modern Dark Theme.
4.  **Restore:** Use the popup to "Show" individual courses or "Show All Modules" to reset.

---

## Privacy & Permissions

*   **Host Permissions:** strictly limited to `https://courseweb.sliit.lk/*`.
*   **Storage:** strictly used to save your hidden course list and theme preference locally.
*   **No Tracking:** We do not collect any user data.

---

## For Developers

Want to contribute?
*   **Tech Stack:** Vanilla JS (MV3), CSS Variables.
*   **Core Logic:**
    *   `scripts/content.js`: Handles API fetching and DOM manipulation.
    *   `styles/modern.css`: Contains the dark theme variables and styles.
    *   `popup/popup.js`: UI logic for the extension popup.

---

## Author

**Kavindu Sahan Silva**

---

## License

MIT License — free for academic and personal use.

---

## Questions?

Found a bug? Open a [GitHub Issue](https://github.com/Kavi-ya/Course-Web/issues).
