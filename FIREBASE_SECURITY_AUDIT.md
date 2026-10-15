# Firebase Firestore Security Rules Read-Only Audit

**Project:** E-Request Admin Portal & E-ReQuest Android Application  
**Firebase Project ID:** `e-resquest`  
**Current Admin Branch:** `audit-fixes`  
**Latest Verified Commit:** `fa08360` (`Fix React Hooks lifecycle and clean up ESLint issues`)  
**Audit Local Timestamp:** 2026-10-08T21:12:00+08:00  
**Audit Scope:** Read-Only Pre-Deployment Security Verification  

---

## 1. Audit Summary

A comprehensive pre-deployment read-only security audit of the Firebase configuration, Firestore access paths, authentication mechanisms, and rule compatibility was conducted across both the Admin Portal (`erequest-admin-portal`) and the Android mobile application (`E-ReQuest`).

The investigation confirmed that both applications share the same Firebase project (`e-resquest`). However, **no local `firestore.rules` file exists in either repository, and no authenticated Firebase CLI access or service account credentials are available locally**. Under Strict Safety Requirement #11, live-rules verification via automated guessing or intrusive probing was immediately halted.

Because the actual published rules in the Firebase Console could not be accessed, this report details the precise backend access matrix required by both clients, identifies critical architectural authorization risks identified in code, specifies compatibility constraints for Fixes #3 and #4, and delivers a formal verdict of **INCONCLUSIVE — LIVE RULES NOT VERIFIED**.

---

## 2. Source of Rules Examined

- **Local Repository Inspection:**
  - Searched `c:\Users\USER\Downloads\erequest-admin-portal-main\erequest-admin-portal-main` for `firestore.rules` or Firebase configuration rules: **None found**.
  - Searched `C:\Users\USER\Downloads\E-ReQuest` for `firestore.rules` or rule files: **None found**.
- **CLI & Environment Inspection:**
  - Evaluated `firebase-tools`: Not installed on system PATH or local npm environment.
  - Evaluated Firebase CLI authentication (`list_plugin_accounts`): No authenticated accounts available.
- **Rules Status:** **NOT AVAILABLE LOCALLY**.

---

## 3. Whether Published Rules Were Actually Verified

- **Published Rules Verified Live:** **NO**.
- **Reason:** Direct access to the live Firebase Console rules requires interactive Google Account authentication on the Firebase Console website (`https://console.firebase.google.com/project/e-resquest/firestore/rules`). Per safety constraints, no production credentials or intrusive penetration attempts were used.
- **Action Taken:** In strict compliance with Safety Requirement #11 ("*If actual Firebase Console rules cannot be accessed safely, STOP the live-rules verification and request that I manually provide the rules text*"), live verification was stopped, and the user is requested to provide the published rules.

---

## 4. Collection-by-Collection Access Matrix

Based on complete source code inspection of the Admin Portal (`src/features/*`) and Android application (`com.example.request.*`), the following access matrix defines the operations performed by each client:

| Collection | Unauth Reads (Student Android) | Auth Student Reads | Auth Admin Reads (Admin Portal) | Unauth Writes | Auth Student Writes | Auth Admin Writes (Create / Update / Delete) | Operations Performed in Code |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **`services`** | **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `runTransaction` create, `setDoc` merge, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`transactions`** | **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `runTransaction` create, `setDoc` merge, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`requirements`** | **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `runTransaction` create, `setDoc` merge, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`procedure_steps`**| **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `runTransaction` create, `setDoc` merge, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`department_guidelines`** | **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `runTransaction` create, `setDoc` merge, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`announcements`**| **REQUIRED** | Required | Required | Disallowed | Disallowed | **REQUIRED** | Admin: `addDoc`, `updateDoc`, `deleteDoc`. Android: `get()`, `addSnapshotListener`. |
| **`activity_logs`** | Disallowed | Disallowed | **REQUIRED** | Disallowed | Disallowed | **REQUIRED (Create Only)** | Admin: `addDoc` (create), `getDocs` (read). No update/delete. Android: Never accesses. |
| **`admins`** | Disallowed | Disallowed | **REQUIRED (Read Only)** | Disallowed | Disallowed | Disallowed (Console Bootstrapped) | Admin: `getDoc(doc(db, "admins", user.uid))` in auth & ProtectedRoute. Android: Never accesses. |
| **`device_tokens`** | Disallowed | Disallowed | Not used | **REQUIRED (Create/Set)** | Required | Not used | Android: `setDoc(doc(db, "device_tokens", installationId))` via `FCMTokenManager.kt`. Admin: Never accesses. |

---

## 5. Authentication and Admin Authorization Findings

### 5.1 Student Android Client Has No Firebase Authentication
- **Finding:** Inspection of `C:\Users\USER\Downloads\E-ReQuest\app\src\main` revealed zero instances of `FirebaseAuth`.
- **Impact:** The mobile application accesses Firestore completely unauthenticated (`request.auth == null`).
- **Security Implication:** If Firestore Security Rules enforce `request.auth != null` on the 6 content collections (`services`, `transactions`, `requirements`, `procedure_steps`, `department_guidelines`, `announcements`), the entire Android student experience will fail with `FirebaseFirestoreException: PERMISSION_DENIED`.
- **Requirement:** Read access on these 6 content collections must be public (`allow read: if true;`).

### 5.2 Device Token Registration is Unauthenticated
- **Finding:** In `FCMTokenManager.kt`, the Android app writes FCM push tokens to `device_tokens/{installationId}` using `setDoc()`.
- **Security Implication:** Because students are not signed in, writing tokens requires unauthenticated create/update access. If rules require authentication, token registration fails. Conversely, if `device_tokens` allows unrestricted unauthenticated writes without validation, malicious actors could flood the collection.

### 5.3 Client-Side `ProtectedRoute` vs Backend Security Rules
- **Finding:** In the Admin Portal, `ProtectedRoute.jsx` checks:
  ```javascript
  const adminRef = doc(db, "admins", user.uid);
  const adminSnapshot = await getDoc(adminRef);
  const authorized = adminSnapshot.exists() && adminSnapshot.data().role === "admin";
  ```
- **Critical Risk:** A client-side `ProtectedRoute` only hides or shows React routes in the browser. It provides zero security at the database layer. Any user authenticated via Firebase Authentication (even an unauthorized student account, if email sign-up is open) could directly call the Firestore Web SDK and execute creates, updates, or deletes unless the **published Firestore Security Rules** explicitly enforce:
  ```javascript
  function isAdmin() {
    return request.auth != null &&
      exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
      get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == "admin";
  }
  ```
- **Admins Collection Immutability:** If ordinary users or clients can create or update documents in `/admins/{uid}`, they could self-assign the `admin` role (Privilege Escalation). The `/admins` collection must strictly prohibit client writes (`allow write: if false;`).

---

## 6. Compatibility with Fixes #3 and #4

### 6.1 Firestore `runTransaction()` Atomic Create-if-Absent
- **Mechanism:** In Fix #4, all create operations execute inside Firestore transactions:
  ```javascript
  await runTransaction(db, async (transaction) => {
    const existingDoc = await transaction.get(docRef);
    if (existingDoc.exists()) {
      throw new Error(`Record already exists.`);
    }
    transaction.set(docRef, fullData);
  });
  ```
- **Rules Compatibility Requirement:**
  1. In Firestore rules, a transaction write requires **both read (`allow get`) and create (`allow create`)** permissions for the executing admin.
  2. If rules restrict `read` while allowing `create`, the transaction will fail during `transaction.get(docRef)`.
  3. If rules check document ID format using auto-ID regexes (e.g., verifying `docId.size() == 20`), the revised human-readable IDs (`registrar`, `getting_prospectus`, `getting_prospectus_step_001`) would be rejected.

### 6.2 Timestamp Writes via `serverTimestamp()` (Fix #3)
- **Mechanism:** `src/utils/timestampUtils.js` writes `createdAt: serverTimestamp()` and `updatedAt: serverTimestamp()`.
- **Rules Compatibility Requirement:**
  - During rule evaluation, a `serverTimestamp()` field evaluates to `request.time`.
  - If rules perform type checks, they must expect a `timestamp` type (e.g. `request.resource.data.createdAt is timestamp`).
  - If legacy rules check for string or integer milliseconds (e.g. `is string` or `is int`), the write will fail.

### 6.3 Update Immutability & Document IDs
- **Mechanism:** Updates use `setDoc(doc(db, col, id), updateData, { merge: true })`.
- **Rules Compatibility Requirement:**
  - Rules must allow `update` operations on existing document IDs without requiring ID migration.
  - If rules prevent field updates to `createdAt`, the update payloads correctly preserve existing `createdAt` and only modify `updatedAt`.

---

## 7. Android Application Synchronization Compatibility

1. **Unauthenticated Read Support:** Android sync methods (`syncServices()`, `syncTransactions()`, etc.) execute direct `.get().await()` and `.addSnapshotListener()` without auth tokens. Public read access is mandatory.
2. **Deletion Reconciliation:** Android reconciles deletions in a Room transaction by comparing Firestore snapshot document IDs with local SQLite IDs. This is fully compatible with Firestore rules since it relies solely on the read snapshot.
3. **Timestamp Deserialization:** Android's `readTimestampMillis()` supports Firestore `Timestamp` objects, numbers, and dates. It is fully compatible with server timestamps.

---

## 8. Security Risk Classification

| Finding ID | Classification | Severity | Description | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SEC-01** | Architecture / Risk | **HIGH** | If published rules lack backend `isAdmin()` checks, any authenticated user can modify content bypassing frontend `ProtectedRoute`. | Potential / Unverified |
| **SEC-02** | Architecture / Risk | **HIGH** | If `/admins` collection allows client-side write access, any authenticated user can self-escalate to admin. | Potential / Unverified |
| **SEC-03** | Functionality / Blocker | **CRITICAL** | If published rules require authentication (`request.auth != null`) for read access, the Android mobile application will fail completely. | Potential / Unverified |
| **SEC-04** | Functionality / Blocker | **HIGH** | If published rules enforce auto-ID length/character constraints, human-readable IDs from Fix #4 will be rejected. | Potential / Unverified |
| **SEC-05** | Push Notifications | **MEDIUM** | If `/device_tokens` requires authentication, Android FCM token registration fails. If completely unconstrained, it is vulnerable to spamming. | Potential / Unverified |
| **SEC-06** | Rules Visibility | **INFORMATIONAL** | Published rules could not be viewed locally; manual provision from Firebase Console required. | Confirmed Fact |

---

## 9. Recommended Target Security Rules (For User Reference)

The following reference ruleset demonstrates the exact configuration that satisfies all application requirements securely:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if requesting user is authenticated admin
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == "admin";
    }

    // Admins Collection: Read-only for authenticated users checking their own status. Never client-writable.
    match /admins/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Must be managed via Firebase Console
    }

    // Public School Content: Read-only for public students, write-only for verified admins
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

    // Activity Logs: Append-only and read-only for verified admins
    match /activity_logs/{logId} {
      allow read, create: if isAdmin();
      allow update, delete: if false;
    }

    // Device Tokens: Android push notification registration (rate/field-bounded)
    match /device_tokens/{installationId} {
      allow read: if false;
      allow write: if request.resource.data.keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt']);
    }
  }
}
```

---

## 10. Unverified Assumptions and Limitations

1. **No Access to Firebase Console:** The actual text currently published in the Firebase Console under `Firestore Database > Rules` could not be retrieved due to lack of local credentials.
2. **Assumed Current State:** It is unknown whether the live database is running in open test mode (`allow read, write: if true;`), standard user-auth mode (`allow read, write: if request.auth != null;`), or an existing custom ruleset.
3. **Action Required:** The user must inspect and provide the live rules from the Firebase Console before final production deployment.

---

## 11. Final Verdict

```
===================================================================
      VERDICT: INCONCLUSIVE — LIVE RULES NOT VERIFIED
===================================================================
```

**Justification:** While the client-side code analysis, collection mapping, and Fix #3/#4 compatibility requirements are fully mapped and verified, the **actual published security rules in the Firebase Console could not be accessed**. In accordance with Safety Requirement #12 ("*Do not claim the rules are secure or compatible without examining the actual published rules*"), the verdict remains **INCONCLUSIVE** until the live rules text is provided.

---

## 12. Audit Integrity Confirmations

- **Git Branch:** `audit-fixes`
- **Head Commit:** `fa08360`
- **Source Code Modified:** **NO** (Zero source code files were edited or staged).
- **Firebase Production Data Modified:** **NO** (Zero documents were added, altered, or deleted).
- **Firebase Security Rules Modified:** **NO** (Zero rules were published or modified).
