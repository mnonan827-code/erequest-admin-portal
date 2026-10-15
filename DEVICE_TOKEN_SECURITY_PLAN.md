# E-Request — Device Token Security & Hardening Plan

**Date:** October 8, 2026  
**Project:** E-Request Admin Portal & E-ReQuest Android Application  
**Firebase Project ID:** `e-resquest`  
**Scope:** Review of `device_tokens` Collection, `FCMTokenManager.kt`, and Push Notification Architecture  
**Status:** PROPOSED PLAN — AWAITING USER APPROVAL (READ-ONLY INSPECTION COMPLETED)  

---

## 1. Executive Summary

This security assessment evaluates the lifecycle, risks, and hardening requirements for the `device_tokens` Firestore collection. The E-ReQuest Android application uses Firebase Cloud Messaging (FCM) to deliver updates on school transactions. Because student users access the application without authentication (`FirebaseAuth` is not used in the mobile client), device token registration currently relies on **unauthenticated Firestore write operations**.

This document outlines:
1. The exact technical behavior of `FCMTokenManager.kt` and `ERequestFirebaseMessagingService.kt`.
2. Confirmed and potential security vulnerabilities associated with unauthenticated token registration.
3. The configuration and enforcement status of Firebase App Check.
4. Hardened Firestore Security Rules for `device_tokens` tailored specifically to preserve current Android functionality while eliminating read exposure, arbitrary payload injection, and document key hijacking.
5. Inherent architectural limitations that cannot be resolved solely via Firestore Security Rules.
6. A comprehensive, actionable testing matrix to validate security enforcement before deployment.

---

## 2. Technical Architecture & Device Token Lifecycle

### 2.1 Document ID Generation
- **Source File:** `C:\Users\USER\Downloads\E-ReQuest\app\src\main\java\com\example\request\FCMTokenManager.kt`
- **Method:** `UUID.randomUUID().toString()`
- **Storage:** Persisted locally on the device in `SharedPreferences` (`erequest_device_preferences`) under key `installation_id`.
- **Format:** Canonical 36-character hyphenated UUID version 4 string (e.g., `8f14e45f-9e2b-4228-b0a7-68165cf9b001`).
- **Firestore Path:** `/device_tokens/{installationId}`

### 2.2 Fields, Data Types, and Payload Structure
During token registration and token refresh, `FCMTokenManager.saveToken(token)` executes `firestore.collection("device_tokens").document(installationId).set(deviceData)`. 

The write operation always supplies exactly 5 fields:

| Field Name | Data Type | Value / Generation Rule | Mutable on Refresh? |
| :--- | :--- | :--- | :---: |
| `installationId` | `String` (36 chars) | Matches the document ID (`UUIDv4`) | No (Same device ID) |
| `token` | `String` | FCM token from `FirebaseMessaging.getInstance().token` | Yes (Rotated token) |
| `platform` | `String` | Hardcoded constant `"android"` | No |
| `active` | `Boolean` | Hardcoded boolean `true` | No |
| `updatedAt` | `FieldValue.serverTimestamp()` | Firestore Server Timestamp (`request.time`) | Yes (Updated on every write) |

*Note: No `createdAt` field is included. The operation uses `.set()` without merge options, completely writing all 5 fields.*

### 2.3 Token Update Behavior: Rotation, Reinstallation, and Permissions

1. **Initial Registration (First App Launch):**
   - Triggered from `ERequestApplication.onCreate()` via `applicationScope.launch`.
   - `getInstallationId()` checks `SharedPreferences`. If absent, generates and persists a new UUIDv4.
   - Fetches the current token asynchronously via `FirebaseMessaging.getInstance().token.await()`.
   - Writes the new document to `/device_tokens/{installationId}`.
2. **Token Rotation (FCM Refresh):**
   - Triggered automatically by Google Play Services / Firebase via `ERequestFirebaseMessagingService.onNewToken(token)`.
   - Calls `FCMTokenManager(applicationContext).saveToken(token)`.
   - Reuses the existing `installationId` from `SharedPreferences`.
   - Overwrites the existing document `/device_tokens/{installationId}` with the refreshed token string and a new `serverTimestamp()`.
3. **App Reinstallation / Data Cleared:**
   - Uninstalling the app or clearing Android application data erases `SharedPreferences`.
   - Upon subsequent launch, `getInstallationId()` generates a **brand new UUIDv4**.
   - A new document is created in Firestore under the new installation ID.
   - **Architectural Observation:** The previous document remains orphaned in Firestore with `active: true`. The client has no mechanism to clean up or flag obsolete installation IDs.
4. **Android 13+ Notification Permission Changes:**
   - In `ERequestFirebaseMessagingService.kt`, notification delivery errors (`SecurityException`) are caught and logged if the user revokes `POST_NOTIFICATIONS` permission.
   - **Architectural Observation:** The mobile application **never updates Firestore or sets `active: false`** when notification permissions are toggled off by the user.

### 2.4 Backend Notification Consumer Analysis
- **Admin Portal Inspection:** `erequest-admin-portal` contains zero references to FCM, `device_tokens`, or push notification dispatch.
- **Android App Inspection:** Only registers tokens and handles incoming FCM message payloads (`ERequestFirebaseMessagingService.onMessageReceived`).
- **Cloud Functions / Backend Services:** Neither repository contains a `functions/` codebase or external server script for querying `device_tokens` and dispatching multicast FCM messages.
- **Implication:** FCM push notifications are either dispatched by an external Firebase Cloud Function hosted outside this Git workspace, through Firebase Cloud Messaging Campaigns in the Firebase Console, or planned for future backend integration.

---

## 3. Security Risk Assessment

### 3.1 Confirmed Findings (Observed Directly in Code)
1. **Unauthenticated Write Dependency:** The mobile app contains no Firebase Authentication logic. All `setDoc` operations to `/device_tokens` occur with `request.auth == null`. Any rule requiring user authentication will break FCM token registration.
2. **Zero Read Requirement for Mobile Clients:** Neither the Android app nor the Admin Portal web client ever queries or reads the `device_tokens` collection. Exposing read permissions to clients would serve no functional purpose and would constitute unnecessary exposure.
3. **Orphaned Token Accumulation:** App reinstalls leave old tokens active indefinitely in Firestore without client-side pruners.
4. **Firebase App Check is Absent in Client Code:** The Android app does not include App Check dependencies (`firebase-appcheck`, `play-integrity`) or runtime initialization in `ERequestApplication.kt`.

### 3.2 Potential Risks (Dependent on Published Security Rules)
1. **Token Harvest & Exposure (Critical / High):** If the currently published Firestore rules permit public read access (`allow read: if true;`), any party with the Firebase project configuration can harvest valid FCM tokens and device identifiers for all installed devices.
2. **Document Key Hijacking & Overwrite (Medium):** If rules allow unauthenticated updates without verifying that `request.resource.data.installationId == resource.data.installationId`, an attacker possessing a device's UUID could overwrite its token, hijacking notification delivery.
3. **Unbounded Writes & Payload Injection (Medium / High):** If rules allow arbitrary keys or unconstrained data sizes, malicious actors could write megabyte-sized junk payloads or arbitrary schema fields into `device_tokens`.
4. **Scripted Registration Flooding / Quota Exhaustion (Medium):** Because writes are unauthenticated and App Check is not configured, automated bots can flood Firestore with synthetic UUID documents, exhausting storage and database operation quotas.

---

## 4. Firebase App Check Assessment

### 4.1 Android Client Implementation
- **Dependencies (`build.gradle.kts`):** Neither `com.google.firebase:firebase-appcheck` nor `com.google.firebase:firebase-appcheck-playintegrity` is declared.
- **Application Code (`ERequestApplication.kt`):** No call to `FirebaseAppCheck.getInstance().installAppCheckProviderFactory(...)`.
- **Verdict:** **NOT CONFIGURED IN CODE.**

### 4.2 Web Admin Portal Implementation
- **Vite Application (`src/`):** No App Check SDK or reCAPTCHA Enterprise provider initialized.
- **Verdict:** **NOT CONFIGURED IN CODE.**

### 4.3 Firebase Console Enforcement Status
- **Analysis:** In Firebase Console, App Check can be in one of three states: *Unregistered*, *Monitoring (Metrics Only)*, or *Enforced*.
- **Status:** If App Check enforcement were currently turned **ON (Enforced)** in the Firebase Console for Cloud Firestore, **all requests from both the Android application and the Admin Portal would be blocked immediately with HTTP 403 / App Check validation failures**.
- **Conclusion:** App Check is either **not configured** or **not enforced** in the Firebase Console. Enabling enforcement in the console without first implementing App Check in both client applications would cause complete production service failure.

---

## 5. Hardened Firestore Security Rules for `device_tokens`

To protect the `device_tokens` collection while maintaining 100% backward and forward compatibility with `FCMTokenManager.kt`, the following hardened rule block is proposed:

```javascript
// =====================================================================
// DEVICE TOKENS COLLECTION (Android FCM Push Notification Registration)
// =====================================================================
match /device_tokens/{installationId} {

  // 1. READ PROTECTION:
  // Mobile clients and web portal never read device tokens.
  // Only backend Admin SDK / Cloud Functions should read this collection.
  allow read: if false;

  // 2. CREATE PROTECTION (First Registration):
  allow create: if
    // Path parameter must match the payload installationId
    installationId == request.resource.data.installationId &&
    // installationId must be a valid 36-character UUID string
    request.resource.data.installationId is string &&
    request.resource.data.installationId.size() == 36 &&
    // Token must be a valid string within reasonable FCM bounds (20 to 4096 chars)
    request.resource.data.token is string &&
    request.resource.data.token.size() >= 20 &&
    request.resource.data.token.size() <= 4096 &&
    // Platform must be exactly 'android'
    request.resource.data.platform == 'android' &&
    // active flag must be boolean true
    request.resource.data.active == true &&
    // updatedAt must be set via serverTimestamp()
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt == request.time &&
    // Strictly forbid unknown or extra fields
    request.resource.data.keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt']);

  // 3. UPDATE PROTECTION (Token Refresh / Rotation):
  allow update: if
    // Cannot alter the document's installationId
    installationId == request.resource.data.installationId &&
    request.resource.data.installationId == resource.data.installationId &&
    // Token must be valid string within reasonable FCM bounds
    request.resource.data.token is string &&
    request.resource.data.token.size() >= 20 &&
    request.resource.data.token.size() <= 4096 &&
    // Platform must remain 'android'
    request.resource.data.platform == 'android' &&
    request.resource.data.platform == resource.data.platform &&
    // active flag must be a boolean
    request.resource.data.active is bool &&
    // updatedAt must be refreshed with serverTimestamp()
    request.resource.data.updatedAt is timestamp &&
    request.resource.data.updatedAt == request.time &&
    // Strictly forbid unknown or extra fields
    request.resource.data.keys().hasOnly(['installationId', 'token', 'platform', 'active', 'updatedAt']);

  // 4. DELETE PROTECTION:
  // Mobile clients do not delete records; only backend pruners should delete.
  allow delete: if false;
}
```

### 5.1 Compatibility Breakdown
- **Document ID:** Matches canonical UUIDv4 generated by `FCMTokenManager` (`size() == 36`).
- **Token String:** Permitted length from 20 to 4096 characters covers standard FCM token strings (~140–180 characters) with headroom for future token format changes.
- **Strict Payload Structure:** Only the 5 keys present in `FCMTokenManager.kt` (`installationId`, `token`, `platform`, `active`, `updatedAt`) are accepted.
- **Server Timestamp:** Enforces `request.time` equality, which natively matches `FieldValue.serverTimestamp()`.
- **Zero Impact on Reads:** Blocks all client-side reads while allowing the mobile app to post its registration.

---

## 6. Architectural Limitations of Firestore Security Rules

While the proposed rules provide strict schema, payload, and privacy boundaries, certain threats cannot be mitigated with Firestore Security Rules alone:

1. **Unauthenticated Sybil / Script Flooding:**
   - *Limitation:* Firestore Security Rules operate per-document and do not possess stateful rate limiters, IP tracking, or CAPTCHA capabilities.
   - *Impact:* A malicious script can generate random valid UUIDv4 strings and arbitrary 150-character strings to create new valid documents.
   - *Long-Term Fix:* Integration of Firebase App Check with the Google Play Integrity API for Android, verifying that requests originate from a legitimate, untampered device.
2. **Orphaned Token Cleanup:**
   - *Limitation:* Rules cannot detect when an app is uninstalled.
   - *Long-Term Fix:* A Cloud Function or backend cron job that sends a test multicast or processes FCM delivery feedback (detecting `NOT_FOUND` or `UNREGISTERED` errors) to remove dead tokens.
3. **Replay Overwrite of Known UUIDs:**
   - *Limitation:* If an attacker learns another device's UUIDv4 installation ID, they can overwrite that device's token with their own or a fake token because client authentication is not tied to a user identity.
   - *Mitigation in Rules:* The 122-bit entropy of UUIDv4 prevents brute-force guessing ($2^{-122}$).

---

## 7. Actionable Verification & Test Plan

Before applying these rules to production, perform the following structured validation steps:

| Test Case | Actor / Method | Action | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :---: | :--- |
| **TC-01: First-Time Registration** | Real Android App | Clean install / launch app | `ALLOW` | Document created with 5 valid fields; logs show `"FCM device token registered successfully."` |
| **TC-02: Token Refresh** | Real Android App | Trigger `onNewToken` or re-register | `ALLOW` | Document updated in-place; `token` and `updatedAt` refreshed; `installationId` unchanged. |
| **TC-03: Unauthorized Read** | Unauthenticated Client (REST / Web) | `getDocs(collection("device_tokens"))` | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-04: Specific Token Read** | Unauthenticated Client (REST / Web) | `getDoc(doc("device_tokens", uuid))` | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-05: Client Deletion Attempt** | Unauthenticated Client | `deleteDoc(doc("device_tokens", uuid))` | `REJECT` | Fails with `PERMISSION_DENIED`. |
| **TC-06: Payload Injection** | Script / Test Runner | Attempt `.set()` with extra field (e.g. `"isAdmin": true`) | `REJECT` | Rejected by `hasOnly()` restriction. |
| **TC-07: Mismatched Document ID** | Script / Test Runner | Path: `/device_tokens/UUID-A`<br>Payload: `installationId: "UUID-B"` | `REJECT` | Rejected by `installationId == request.resource.data.installationId`. |
| **TC-08: Invalid Platform** | Script / Test Runner | Payload: `platform: "ios"` or `"web"` | `REJECT` | Rejected by `platform == 'android'`. |
| **TC-09: Invalid Timestamp** | Script / Test Runner | Payload: `updatedAt: 1728400000000` (client integer or spoofed date) | `REJECT` | Rejected by `updatedAt == request.time`. |
| **TC-10: Push Notification Delivery** | FCM Backend / Console | Send push notification targeted to updated token | `DELIVERED` | Android device displays heads-up notification in `erequest_transaction_updates` channel. |

---

## 8. Summary of Findings

- **Confirmed:** Android client requires unauthenticated write access for push notification registration; client-side reads are completely unused.
- **Confirmed:** App Check is not implemented in Android or Admin Portal code; console enforcement must remain OFF until client integration occurs.
- **Proposed Solution:** Deploy the strict schema-validated, read-blocked rules for `device_tokens` detailed in Section 5.
- **Next Step:** Awaiting user review and explicit approval. No rules or code have been modified.
