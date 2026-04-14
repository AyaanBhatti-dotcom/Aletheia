# Aletheia

Aletheia is a private, local-first symptom and cycle tracking app built for people living with endometriosis.

Endometriosis affects 1 in 10 women, is still severely underresearched, and many dedicated tracking apps are either expensive, privacy-invasive, or both. Aletheia exists to provide a free alternative that keeps control with the person logging their health: no account required, no subscriptions, and no automatic cloud upload.

---

## Who It Is For

- People tracking endometriosis-related symptoms over time
- Anyone who wants cycle + symptom history in one place
- Users who prioritize privacy and want data to stay on-device
- People preparing for medical appointments with structured records

---

## Why Aletheia Exists

Most health trackers assume cloud accounts, analytics, and recurring payments.  
Aletheia takes the opposite approach:

- local-first by default
- privacy by design
- free to use
- understandable enough for non-technical users, inspectable enough for technical users

---

## Core Features

### Symptom Logging
- Log date/time of episodes
- 1-10 pain scale with severity labels
- Pain type tracking (sharp, dull, cramping, etc.)
- Body area tracking (pelvic, digestive, systemic categories)
- Free-text notes
- Optional photo attachment (validated and size-limited)
- Custom user-defined symptoms saved for reuse

### Cycle Tracking
- Daily period tracker form with:
  - flow level
  - blood color
  - clot tracking
  - discharge tracking
  - cycle day (optional/manual)
  - breast tenderness, bloating, pelvic pain, systemic pain (0-10)
- Calendar view with month navigation
- Tap any day to open/edit that day's data
- Daily "spotlight" modal for detailed review
- Visual flow-level calendar markers

### Cycle Estimates and Forecasting
- Estimated cycle phase (menstrual, follicular, ovulatory, luteal)
- Predicted next period window (from logged history)
- Predicted ovulation day
- Predicted fertile window
- Average cycle length and average period length estimates  
  (all shown as directional estimates, not medical certainty)

### Insights and Pattern Detection
- 30-day average pain
- Top recurring symptoms
- High-frequency symptom detection
- Pain by cycle phase
- Flare detection (high pain streaks across multiple days)
- Empty-state guidance until enough data exists

### History and Detail Views
- Unified log history (symptom + cycle entries)
- Full detail pages for each saved entry
- Recent activity preview on dashboard
- Quick links from dashboard into detailed logs

### Reports and Data Portability
- Generate local PDF health summary report (`jsPDF`)
- Readable JSON export (plaintext, with explicit warning)
- Protected JSON export (for locked journals)
- JSON import support for both readable and protected backups
- Import validation (format checks, record count limits, file size limits, payload validation)

### Journal Lock
- Optional passphrase-protected journal mode
- Lock/unlock per session
- "Lock now" control
- Turn lock off only from unlocked state
- Lock status visible in Settings

### Safety and Usability Extras
- First-run onboarding tour (replayable)
- Demo mode with realistic sample data
- Doctor guide/FAQ page with appointment preparation questions
- Warning notices for skipped/unreadable records
- Confirmed destructive action flow for clearing all data

---

## Security Architecture (Plain English)

Aletheia's security is built so private data stays private on your device:

- **All health data at rest can be encrypted with AES-256-GCM** when journal lock is enabled.
- **Keys are derived from your passphrase using PBKDF2 (SHA-256) with 200,000 iterations** and per-journal salt.
- **Crypto keys are non-extractable** and kept only in memory for the active session.
- **Journal lock protects symptom entries, cycle entries, and user-defined symptoms** while locked.
- **Imports are validated** before restoring:
  - structure checks
  - protected payload checks
  - file size and record count safety limits
- **Strict Content Security Policy (CSP)** is set in `index.html` to allow only same-origin resources.
- **Fonts are self-hosted** (`Lora`, `Nunito`) and loaded from local project assets.
- **No external data transfer by default**: records are local unless you explicitly export/share files yourself.

---

## Privacy Philosophy

Aletheia is designed around one rule: **your data is yours**.

- no servers
- no tracking SDKs
- no analytics beacons
- no subscriptions
- no account requirement

Your entries remain in your browser storage and never leave your device unless you explicitly export them.

---

## Tech Stack

- **Frontend:** React 19 + React Router
- **Build Tooling:** Vite
- **Storage:** IndexedDB (browser-local)
- **Cryptography:** Web Crypto API (`PBKDF2`, `AES-GCM`)
- **Export:** `jsPDF` for local PDF generation
- **Sanitization/Security utilities:** `DOMPurify` is included as a dependency
- **Deployment:** GitHub Pages via GitHub Actions

---

## Getting Started

### Access the app
- Hosted on GitHub Pages from this repository's `main` branch.
- Default GitHub Pages URL pattern for this repo is:

https://aletheiatracker.space/

---

## Data Model (High-Level)

Aletheia stores:
- symptom entries
- cycle entries
- app metadata (including journal protection config and custom symptom list)

All stored locally in IndexedDB under the app's own database.

---

## Important Notes

- If you forget your passphrase, protected journal contents cannot be opened.
- Readable exports are plaintext: anyone with that file can read your entries.
- Predictions and insights are assistive tracking tools, not clinical diagnosis.

---

## License

No explicit license file is currently present in this repository. Add one if you plan public reuse.
