/**
 * Development Helper: Seed Test Administrator in Local Firebase Emulators
 *
 * Usage:
 *   node scripts/seedEmulatorAdmin.js [email] [password] [projectId] [authPort] [firestorePort]
 *
 * Defaults:
 *   Email:         erequesticctadmin@gmail.com
 *   Password:      #ICCT4228
 *   Project ID:    demo-erequest-portal
 *   Auth Port:     9099
 *   Firestore Port: 8088
 *   Host:          127.0.0.1
 *
 * This script runs locally via native fetch (Node.js 18+) without requiring external dependencies.
 */

import process from "node:process";

const email = process.env.EMULATOR_ADMIN_EMAIL || process.argv[2] || "erequesticctadmin@gmail.com";
const password = process.env.EMULATOR_ADMIN_PASSWORD || process.argv[3] || "#ICCT4228";
const projectId = process.argv[4] || process.env.VITE_FIREBASE_EMULATOR_PROJECT_ID || "demo-erequest-portal";
const authPort = process.argv[5] || process.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || "9099";
const firestorePort = process.argv[6] || process.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || "8088";
const host = process.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";

// Safety check: Never run against production
if (!projectId.startsWith("demo-")) {
  console.error(`[SAFETY ERROR] Seed script aborted: Project ID must start with "demo-" (got "${projectId}").`);
  process.exit(1);
}

async function main() {
  console.log("============================================================");
  console.log("  E-Request Admin Portal - Emulator Admin Seeder");
  console.log("============================================================");
  console.log(`Target Project:   ${projectId}`);
  console.log(`Auth Endpoint:    http://${host}:${authPort}`);
  console.log(`Firestore:        http://${host}:${firestorePort}`);
  console.log(`Admin Email:      ${email}`);
  console.log("------------------------------------------------------------");

  let uid = null;

  // Step 1: Create or Sign-In user in Auth Emulator
  const signUpUrl = `http://${host}:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`;
  try {
    const res = await fetch(signUpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    const data = await res.json();
    if (res.ok) {
      uid = data.localId;
      console.log(`[AUTH] Created user in Auth Emulator with UID: ${uid}`);
    } else if (data.error && data.error.message === "EMAIL_EXISTS") {
      console.log("[AUTH] User already exists in Auth Emulator, fetching UID via sign-in...");
      const signInUrl = `http://${host}:${authPort}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`;
      const signInRes = await fetch(signInUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const signInData = await signInRes.json();
      if (!signInRes.ok) {
        throw new Error(`Failed to sign in existing user: ${JSON.stringify(signInData.error)}`);
      }
      uid = signInData.localId;
      console.log(`[AUTH] Successfully authenticated existing user UID: ${uid}`);
    } else {
      throw new Error(`Auth signUp failed: ${JSON.stringify(data.error)}`);
    }
  } catch (err) {
    console.error(`[AUTH ERROR] Could not reach Auth Emulator at http://${host}:${authPort}. Is it running?`, err.message);
    process.exit(1);
  }

  // Step 2: Create/Update admins/{uid} document in Firestore Emulator
  // Note: Firestore Security Rules enforce `allow write: if false;` on the admins collection
  // for client SDKs. In the Firebase Emulator, sending `Authorization: Bearer owner` provides
  // administrative bypass to bootstrap admin role records, matching Firebase Admin SDK behavior.
  const firestoreDocUrl = `http://${host}:${firestorePort}/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`;
  const nowIso = new Date().toISOString();

  try {
    const res = await fetch(firestoreDocUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer owner"
      },
      body: JSON.stringify({
        fields: {
          role: { stringValue: "admin" },
          email: { stringValue: email },
          name: { stringValue: "Admin User" },
          position: { stringValue: "System Administrator" },
          department: { stringValue: "Registrar's Office" },
          createdAt: { stringValue: nowIso },
          updatedAt: { stringValue: nowIso }
        }
      })
    });

    if (!res.ok) {
      const errData = await res.text();
      throw new Error(`Firestore PATCH returned HTTP ${res.status}: ${errData}`);
    }

    console.log(`[FIRESTORE] Successfully created/updated admins/${uid} with { role: "admin" }`);
    console.log("------------------------------------------------------------");
    console.log("SUCCESS! Test administrator account is ready for local login:");
    console.log(`  Email:    ${email}`);
    console.log(`  Password: [REDACTED - Set securely in emulator]`);
    console.log(`  UID:      ${uid}`);
    console.log("============================================================");
  } catch (err) {
    console.error(`[FIRESTORE ERROR] Could not write to Firestore Emulator at http://${host}:${firestorePort}. Is it running?`, err.message);
    process.exit(1);
  }
}

main();
