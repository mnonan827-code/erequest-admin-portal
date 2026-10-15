# Local Firebase Emulator Setup & Verification Guide

This guide describes how to run and test the **E-Request Admin Portal** against local, isolated Firebase Emulators without touching or exposing production Firebase resources (`e-resquest`).

---

## 1. Security & Isolation Architecture

The emulator integration is strictly **opt-in**, isolated, and protected by fail-fast safeguards:

1. **Opt-in Only:** Production Firebase configuration remains active by default. The local emulator mode is only enabled when `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`.
2. **Demo Project ID Isolation:** In emulator mode, the project ID defaults to `demo-erequest-portal` and **MUST** start with the `demo-` prefix. When using a `demo-` project ID, the Firebase JS SDK operates strictly in offline/mock mode and rejects routing to production Google Cloud endpoints.
3. **Fail-Fast Safety Guard:** If `VITE_USE_FIREBASE_EMULATORS=true` is set but the project ID does not start with `demo-` (such as if a developer mistakenly sets `e-resquest`), the application throws an immediate, fatal `[SECURITY ERROR]` and halts initialization.
4. **Zero Production Credentials:** When emulator mode is active, production API keys and project identifiers are swapped with dummy values (`apiKey: "demo-api-key"`).
5. **No Silent Fallback:** If the emulators are misconfigured or fail to connect, the application halts immediately rather than falling back to production.

---

## 2. Prerequisites

- **Node.js:** v18.0.0 or higher
- **Firebase CLI:** `npm install -g firebase-tools` (or use local `npx firebase`)
- **Java Runtime Environment (JRE/JDK):** Required by Firebase Emulators (e.g. JDK 11+, or the bundled JBR in Android Studio at `C:\Program Files\Android\Android Studio\jbr\bin`)

---

## 3. Step-by-Step Setup

### Step 1: Configure Local Environment Variables

Create a `.env.local` file in the root of `erequest-admin-portal-main` (copied from `.env.example`):

```bash
# Enable emulator mode
VITE_USE_FIREBASE_EMULATORS=true

# Isolated demo project (MUST start with "demo-")
VITE_FIREBASE_EMULATOR_PROJECT_ID=demo-erequest-portal

# Emulator Host & Ports
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_AUTH_EMULATOR_PORT=9099
VITE_FIREBASE_FIRESTORE_EMULATOR_PORT=8088
```

> **Note:** `.env.local` is listed in `.gitignore` and will never be committed to source control.

---

### Step 2: Start the Firebase Emulators

Start the Firebase Auth and Firestore emulators with the isolated demo project:

```bash
# Using Firebase CLI
firebase emulators:start --project demo-erequest-portal --only auth,firestore
```

If you have an emulator `firebase.json` configuration, you can also start the Emulator UI (default port 4000):

```bash
firebase emulators:start --project demo-erequest-portal
```

Verify that the terminal reports:
- **Authentication Emulator:** `127.0.0.1:9099`
- **Firestore Emulator:** `127.0.0.1:8088`

---

### Step 3: Seed the Test Administrator Account

The Admin Portal enforces role-based access control:
1. User must exist in Firebase Auth.
2. A document must exist at `admins/{uid}` in Firestore with field `{ role: "admin" }`.

To automatically seed both records in one command, run the included seeder script:

```bash
node scripts/seedEmulatorAdmin.js
```

**Default Credentials Created:**
- **Email:** `admin@test.local`
- **Password:** `TestAdmin123!`
- **Firestore Document:** `admins/{uid}` with `{ role: "admin", email: "admin@test.local" }`

#### Optional: Custom Credentials
```bash
node scripts/seedEmulatorAdmin.js custom@test.local MyPassword123!
```

#### Manual Alternative (via Emulator Suite UI at http://127.0.0.1:4000):
1. Navigate to **Authentication** tab -> **Add user**:
   - Email: `admin@test.local`
   - Password: `TestAdmin123!`
   - Copy the generated `UID`.
2. Navigate to **Firestore** tab -> **Start collection**:
   - Collection ID: `admins`
   - Document ID: `<paste the UID>`
   - Field `role` (type `string`): `"admin"`
   - Field `email` (type `string`): `"admin@test.local"`

---

### Step 4: Run the Admin Portal

Start the Vite development server:

```bash
npm run dev
```

Open your browser to the local dev server URL (e.g. `http://localhost:5173/erequest-admin-portal/`).

---

## 4. Verification Checklist Before Performing CRUD Tests

Before executing any tests, verify in your browser:

1. **Console Banner:**
   Open Chrome DevTools Console (`F12`). You should see:
   ```text
   [Firebase Emulator] Mode ACTIVE. Connected to Auth (http://127.0.0.1:9099) and Firestore (127.0.0.1:8088) for project "demo-erequest-portal".
   ```
2. **Window Diagnostic Object:**
   In DevTools Console, type:
   ```javascript
   window.__FIREBASE_EMULATOR_ACTIVE__ // Returns true
   window.__FIREBASE_EMULATOR_CONFIG__ // Returns { host: "127.0.0.1", authPort: 9099, firestorePort: 8088, ... }
   ```
3. **Network Tab Inspection:**
   - Filter Network requests for `identitytoolkit` and `firestore`.
   - Sign in using `admin@test.local` / `TestAdmin123!`.
   - All Auth requests must target: `http://127.0.0.1:9099/...`
   - All Firestore requests must target: `http://127.0.0.1:8088/...`
   - **Zero requests** may be sent to `identitytoolkit.googleapis.com` or `firestore.googleapis.com`.

---

## 5. Returning to Production Mode

To return to production Firebase:
1. In `.env.local`, set:
   ```bash
   VITE_USE_FIREBASE_EMULATORS=false
   ```
   (or simply remove or rename `.env.local`).
2. Restart Vite (`npm run dev`).
3. The application will connect directly to production `e-resquest` using the production Firebase configuration.

---

## 6. Automated Test Suite

Run the full automated test suite anytime:

```bash
# Run all unit tests (ID generation + emulator configuration)
npm test

# Run ESLint check
npm run lint

# Run production build check
npm run build
```
