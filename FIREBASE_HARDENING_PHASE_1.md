# E-Request — Firebase Security Hardening Plan (Phase 1)
## Device Token Security, Architecture Evaluation & Safe Testing

**Date:** October 8, 2026  
**Project:** E-Request Admin Portal & E-ReQuest Android Application  
**Firebase Project ID:** `e-resquest`  
**Target File:** `FIREBASE_HARDENING_PHASE_1.md`  
**Status:** PROPOSED ARCHITECTURAL PLAN — AWAITING USER APPROVAL (READ-ONLY)  

---

## 1. Corrected Threat Model & Device Ownership Analysis

### 1.1 The Inherent Limitation of Unauthenticated Firestore Access
A critical security finding in unauthenticated mobile architectures is that **UUIDv4 document IDs and schema type checks do NOT establish device ownership or cryptographic identity**.

In Cloud Firestore Security Rules, the evaluation engine provides three contextual variables:
- `request.auth` (Authentication token and claims)
- `request.resource` (Proposed document write payload)
- `resource` (Existing document currently stored in Firestore)

When an Android client does not authenticate (`request.auth == null`), the following security realities apply:
1. **Total Anonymity:** Every unauthenticated request is indistinguishable from any other request worldwide. Firestore rules have no visibility into client IP addresses, device hardware IDs, TLS client certificates, or app signature fingerprints.
2. **No Ownership Binding:** An unauthenticated client cannot prove that it is the legitimate owner of `/device_tokens/{installationId}`. If an installation ID is intercepted (via device inspection, network sniffing on compromised networks, or leaked logs), any third party can submit an update request to that document.
3. **Token Decoupling:** Firestore rules cannot verify whether the string provided in `request.resource.data.token` was actually issued by FCM to that physical device, or if it belongs to another device or is a synthetic string.
4. **Conclusion:** **An unauthenticated client CANNOT securely prove ownership or update its own token using Firestore Security Rules alone.** True identity, ownership, and origin verification require an attestation layer (Firebase App Check) or an authentication session (Firebase Anonymous Auth or Custom Auth).

---

## 2. Architecture Comparison

To resolve these risks for an application where students access information freely without creating accounts, three distinct architectures were evaluated:

| Architecture | Mechanism | Device Ownership Verification | Anti-Abuse & Anti-Bot Protection | Compatibility with Existing Android App | Firebase Billing Requirement |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **A. Enhanced Direct Firestore Rules** | Direct client writes with strict schema, regex, size, immutability, and read denial. | **None** (Entropy-only: relying on UUIDv4 122-bit randomness). | Low (Vulnerable to scripted storage flooding). | **100% Compatible** (Zero Android code changes required). | Free (Spark Plan) |
| **B. Firebase App Check + Direct Firestore** | App Check (Play Integrity) verifies app genuineness before allowing direct Firestore writes. | **App-Level Only** (Verifies genuine app on genuine device, not individual user). | **High** (Blocks bots, emulators, curl/REST scripts, and non-genuine apps). | Requires Android code update & Play Integrity setup. | Free (Spark Plan - within Play Integrity quotas) |
| **C. Backend Registration (Cloud Functions / Cloud Run)** | Client Firestore writes denied (`allow write: if false;`). App calls App Check-protected HTTPS callable. | **Full** (Backend validates token via FCM Admin SDK, deduplicates, and manages lifecycle). | **Very High** (Server-side rate limiting, token validation, automated pruning). | Requires Android code refactor to invoke Cloud Functions. | **Pay-As-You-Go (Blaze Plan required)** |
| **Alternative: Firebase Anonymous Auth** | Android calls `signInAnonymously()`. Token doc ID becomes `/device_tokens/{auth.uid}`. | **Cryptographic** (`request.auth.uid == installationId`). Rules strictly enforce owner-only updates. | Moderate (Tied to Firebase Auth quotas; stops unauthorized overwrites). | Requires minimal Android code update (`signInAnonymously()`). | Free (Spark Plan) |

---

## 3. Recommended Approach: Pragmatic Phased Strategy

For the E-ReQuest student mobile application, we recommend a **Phased Implementation**:

### Phase 1 (Immediate Deployment — Zero Android Changes): Hardened Architecture A
Deploy strict, schema-validated Firestore Security Rules that:
- Completely block client-side reads (`allow read: if false;`). This immediately closes the critical token harvesting vulnerability.
- Enforce strict document structure, data types, UUID format, platform constancy (`'android'`), and server timestamps.
- Restrict updates so that `installationId` and `platform` are strictly immutable.
- Keep the Android app 100% operational without requiring immediate app updates or store releases.

### Phase 2 (Next App Release): Architecture B + Anonymous Auth
In the upcoming Android release:
1. Add Firebase App Check (Google Play Integrity provider) to guarantee requests come only from the authentic E-ReQuest APK.
2. Initialize Firebase Anonymous Authentication (`signInAnonymously()`) on startup, mapping the installation ID to `request.auth.uid`.
3. Update Firestore rules to enforce `allow write: if request.auth.uid == installationId;`.

---

## 4. Complete Proposed Firestore Security Rules

The following complete ruleset protects all 8 Firestore collections, preserves public student reads, enforces admin authorization, and applies the hardened schema for `device_tokens`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // =================================================================
    // HELPER FUNCTIONS
    // =================================================================

    // Verify whether the requesting user is an authorized administrator
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == "admin";
    }

    // Validate canonical UUIDv4 format (36 chars: 8-4-4-4-12 hex)
    function isValidUUID(uuid) {
      return uuid is string &&
        uuid.size() == 36 &&
        uuid.matches('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$');
    }

    // Validate FCM registration token length and character bounds
    function isValidFCMToken(token) {
      return token is string &&
        token.size() >= 20 &&
        token.size() <= 4096;
    }

    // =================================================================
    // 1. ADMINS COLLECTION
    // =================================================================
    // Read: Authenticated admins may only read their own authorization doc.
    // Write: Strictly forbidden from client SDKs. Must be provisioned via Firebase Console.
    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // =================================================================
    // 2. PUBLIC SCHOOL CONTENT COLLECTIONS
    // =================================================================
    // Read: Public student access without login (Android app & web visitors).
    // Write: Verified administrators only. Supports atomic runTransaction & serverTimestamp.
    match /services/{serviceId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /transactions/{transactionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /requirements/{requirementId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /procedure_steps/{stepId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /department_guidelines/{guidelineId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /announcements/{announcementId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // =================================================================
    // 3. ACTIVITY LOGS COLLECTION
    // =================================================================
    // Read & Create: Verified administrators only.
    // Update & Delete: Strictly immutable audit trail.
    match /activity_logs/{logId} {
      allow read, create: if isAdmin();
      allow update, delete: if false;
    }

    // =================================================================
    // 4. DEVICE TOKENS COLLECTION (FCM Push Notifications)
    // =================================================================
    match /device_tokens/{installationId} {

      // READ: Never permitted for client SDKs. Prevents token harvesting.
      allow read: if false;

      // CREATE: Initial device registration from FCMTokenManager.kt
      allow create: if
        // Path ID must match payload installationId
        installationId == request.resource.data.installationId &&
        isValidUUID(request.resource.data.installationId) &&
        isValidFCMToken(request.resource.data.token) &&
        request.resource.data.platform == 'android' &&
        request.resource.data.active == true &&
        request.resource.data.updatedAt is timestamp &&
        request.resource.data.updatedAt == request.time &&
        request.resource.data.keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt']);

      // UPDATE: Token rotation via onNewToken in ERequestFirebaseMessagingService.kt
      allow update: if
        // installationId and platform cannot be modified
        installationId == request.resource.data.installationId &&
        request.resource.data.installationId == resource.data.installationId &&
        isValidFCMToken(request.resource.data.token) &&
        request.resource.data.platform == 'android' &&
        request.resource.data.platform == resource.data.platform &&
        request.resource.data.active is bool &&
        request.resource.data.updatedAt is timestamp &&
        request.resource.data.updatedAt == request.time &&
        request.resource.data.keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt']);

      // DELETE: Mobile clients do not delete records; pruners handle deletions.
      allow delete: if false;
    }
  }
}
```

---

## 5. Android Application Compatibility Assessment

### 5.1 Verification against `FCMTokenManager.kt`
- **Document Path:** `firestore.collection("device_tokens").document(installationId)` where `installationId` is generated by `UUID.randomUUID().toString()`.
  - *Compatibility:* `isValidUUID()` matches UUIDv4 format (36 chars, valid regex). **PASS**.
- **Payload Structure:** 
  ```kotlin
  val deviceData = hashMapOf<String, Any>(
      "installationId" to installationId,
      "token" to token,
      "platform" to "android",
      "active" to true,
      "updatedAt" to FieldValue.serverTimestamp()
  )
  ```
  - *Compatibility:* Keys strictly match `keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt'])`. Data types, platform `'android'`, boolean `true`, and `request.time` equality all match. **PASS**.
- **No Client Reads:** The Android application never calls `get()` or adds snapshot listeners on `device_tokens`. Denying read access (`allow read: if false;`) causes **zero functional impact** to the app.

### 5.2 Verification against School Content Synchronization (`FirestoreSyncManager.kt`)
- `FirestoreSyncManager` executes unauthenticated reads on `services`, `transactions`, `requirements`, `procedure_steps`, `department_guidelines`, and `announcements`.
- The proposed rules preserve `allow read: if true;` across all 6 collections. All Android Room synchronization, offline caching, and deletion reconciliation continue to operate without disruption.

---

## 6. Comprehensive Testing Plan

Execute the following test suite in a non-production Firebase project or using the local Firebase Emulator Suite prior to production rollout:

### Test Suite 1: Device Token Operations
| Test Case ID | Scenario | Execution Method | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :---: | :--- |
| **TC-01** | First-Time Device Registration | Fresh Android app install or emulator launch | `ALLOW` | Document created with 5 valid fields; logs show success. |
| **TC-02** | FCM Token Rotation | Trigger `onNewToken` or call `saveToken` with updated token string | `ALLOW` | Document updated in-place; `token` and `updatedAt` updated; `installationId` unchanged. |
| **TC-03** | Reinstall / Data Cleared | Clear app data in Settings & restart app | `ALLOW` | New UUID document created with new token. |
| **TC-04** | Client Read Attempt | Query `getDocs(collection("device_tokens"))` via REST / Web | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-05** | Client Delete Attempt | Call `deleteDoc(doc("device_tokens", id))` | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-06** | Invalid UUID Format | Attempt create with path `/device_tokens/invalid-id-123` | `REJECT` | Rejected by `isValidUUID()`. |
| **TC-07** | Short Token Payload | Attempt create with token `< 20` characters | `REJECT` | Rejected by `isValidFCMToken()`. |
| **TC-08** | Unauthorized Field Injection | Attempt create with `"isAdmin": true` or `"role": "admin"` | `REJECT` | Rejected by `hasOnly()` validation. |
| **TC-09** | Unauthorized Overwrite / Mutation | Attempt update changing `platform` to `"ios"` or changing `installationId` | `REJECT` | Rejected by immutability checks. |
| **TC-10** | Spoofed Timestamp | Attempt write with client integer/date instead of `serverTimestamp()` | `REJECT` | Rejected by `updatedAt == request.time`. |

### Test Suite 2: Android Offline / Online Behavior
| Test Case ID | Scenario | Execution Method | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :---: | :--- |
| **TC-11** | Offline Token Save | Disable Wi-Fi/Cellular, launch app, trigger token save | `QUEUED` | Local Firestore cache queues write; no app crash. |
| **TC-12** | Offline to Online Recovery | Re-enable internet connection | `COMMITTED` | Queued token write successfully syncs to Firestore. |
| **TC-13** | Student Public Content Sync | Launch Android app online with clean Room database | `SUCCESS` | All 6 content collections sync into SQLite Room tables. |

### Test Suite 3: Admin Portal Operations
| Test Case ID | Scenario | Execution Method | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :---: | :--- |
| **TC-14** | Admin Content Creation | Create Service / Transaction using Admin Portal UI | `ALLOW` | Atomic `runTransaction` succeeds; human-readable ID created. |
| **TC-15** | Admin Content Deletion | Delete Service with no child records | `ALLOW` | Record removed; activity log recorded. |
| **TC-16** | Unauthenticated Content Write | Attempt write to `services` without logging in | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-17** | Admin Log Tampering | Attempt update or delete on `activity_logs` | `REJECT` | Fails with `PERMISSION_DENIED`. |

---

## 7. Safe Migration Sequence (Zero Downtime)

To deploy without disrupting existing installed Android clients:

1. **Step 1: Rules Dry-Run Simulation:** Validate the proposed rules using the Firebase Rules Simulator in Firebase Console or local `@firebase/rules-unit-testing`.
2. **Step 2: Rules Deployment:** Publish the proposed rules to Firebase Console (`Firestore Database > Rules`).
3. **Step 3: Verification with Active Android Client:** Launch the Android application on a physical device. Confirm in logcat that token registration succeeds and school data syncs.
4. **Step 4: Verification of Admin Portal:** Perform a test edit and publish an announcement.
5. **Step 5: Future Android App Release:**
   - Link Google Play Console to Firebase.
   - Add Play Integrity App Check to Android `build.gradle.kts` and `ERequestApplication.kt`.
   - Register debug and release SHA-256 fingerprints in Firebase Console.
   - Release updated app to students.
6. **Step 6: Future App Check Enforcement:**
   - Monitor App Check metrics in Firebase Console until >95% of active clients send valid App Check tokens.
   - Enable App Check Enforcement for Cloud Firestore.

---

## 8. Cost, Deployment & Prerequisites Matrix

| Requirement | Purpose | Applicable Architecture | Billing Plan | Action Required |
| :--- | :--- | :---: | :---: | :--- |
| **Updated Firestore Rules** | Fix token read exposure, schema validation, and immutability | Architecture A (Proposed) | **Free (Spark)** | Paste and publish in Firebase Console Rules tab. |
| **Google Play Console Linking** | Enables Play Integrity API for App Check | Architecture B | **Free** | Link Google Play developer account to Firebase project. |
| **SHA-256 Fingerprints** | Verifies legitimate app build signatures | Architecture B | **Free** | Add debug/release keystore fingerprints in Firebase Project Settings. |
| **Cloud Functions Deployment** | Backend token management & pruning | Architecture C | **Blaze (Pay-as-you-go)** | Upgrade Firebase billing to Blaze; deploy Node.js functions. |

---

## 9. Summary: Confirmed vs. Unresolved Risks

### Confirmed Risks Resolved by Proposed Rules
- [x] **Token Harvesting:** Fully resolved (`allow read: if false;`).
- [x] **Payload Injection / Schema Corruption:** Fully resolved (`hasOnly()`, type checks, size bounds).
- [x] **Document Tampering on Refresh:** Fully resolved (installationId and platform are immutable).
- [x] **Invalid UUIDs / Corrupt Keys:** Fully resolved (`isValidUUID()` regex check).

### Inherent Risks Requiring Future Architectural Steps
- [ ] **Unauthenticated Storage Flooding (Sybil Bot Attacks):** Firestore rules execute per-request without rate-limiting. Requires Firebase App Check (Architecture B) in the next app release.
- [ ] **Cryptographic Device-to-Token Binding:** Unauthenticated clients cannot sign payloads. Requires Firebase Anonymous Auth or Custom Auth.
- [ ] **Orphaned Tokens on Reinstallation:** When users uninstall the app, tokens remain active. Requires a backend cron / Cloud Function to handle FCM `UNREGISTERED` delivery feedback.

---

*This document is a design and safety plan. No source files, Firestore data, or live security rules were modified.*
