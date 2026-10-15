import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveFirebaseConfig,
  PRODUCTION_FIREBASE_CONFIG
} from "../src/firebase/firebaseConfig.js";

/* =========================================================
   1. PRODUCTION MODE (DEFAULT) TESTS
   ========================================================= */

test("Production Mode: Returns production configuration when env is empty", () => {
  const result = resolveFirebaseConfig({});
  assert.equal(result.isEmulator, false);
  assert.deepEqual(result.config, PRODUCTION_FIREBASE_CONFIG);
  assert.equal(result.emulator, undefined);
});

test("Production Mode: Returns production configuration when VITE_USE_FIREBASE_EMULATORS is false or unset", () => {
  const falseCases = [
    { VITE_USE_FIREBASE_EMULATORS: "false" },
    { VITE_USE_FIREBASE_EMULATORS: "" },
    { VITE_USE_FIREBASE_EMULATORS: undefined },
    { VITE_USE_FIREBASE_EMULATORS: "0" },
    { VITE_USE_FIREBASE_EMULATORS: "no" }
  ];

  for (const env of falseCases) {
    const result = resolveFirebaseConfig(env);
    assert.equal(result.isEmulator, false, `Failed for env: ${JSON.stringify(env)}`);
    assert.deepEqual(result.config, PRODUCTION_FIREBASE_CONFIG);
    assert.equal(result.emulator, undefined);
  }
});

/* =========================================================
   2. EMULATOR MODE DEFAULT & CUSTOM RESOLUTION TESTS
   ========================================================= */

test("Emulator Mode: Uses isolated demo project and default emulator endpoints when enabled", () => {
  const env = {
    VITE_USE_FIREBASE_EMULATORS: "true"
  };

  const result = resolveFirebaseConfig(env);
  assert.equal(result.isEmulator, true);
  assert.equal(result.config.projectId, "demo-erequest-portal");
  assert.equal(result.config.apiKey, "demo-api-key");
  assert.equal(result.config.authDomain, "demo-erequest-portal.firebaseapp.com");
  assert.equal(result.config.storageBucket, "demo-erequest-portal.appspot.com");

  assert.ok(result.emulator);
  assert.equal(result.emulator.host, "127.0.0.1");
  assert.equal(result.emulator.authPort, 9099);
  assert.equal(result.emulator.firestorePort, 8088);
  assert.equal(result.emulator.authUrl, "http://127.0.0.1:9099");
  assert.equal(result.emulator.projectId, "demo-erequest-portal");
});

test("Emulator Mode: Respects custom demo project ID, host, and port configurations", () => {
  const env = {
    VITE_USE_FIREBASE_EMULATORS: "true",
    VITE_FIREBASE_EMULATOR_PROJECT_ID: "demo-custom-admin",
    VITE_FIREBASE_EMULATOR_HOST: "localhost",
    VITE_FIREBASE_AUTH_EMULATOR_PORT: "9199",
    VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: "8188"
  };

  const result = resolveFirebaseConfig(env);
  assert.equal(result.isEmulator, true);
  assert.equal(result.config.projectId, "demo-custom-admin");
  assert.equal(result.emulator.host, "localhost");
  assert.equal(result.emulator.authPort, 9199);
  assert.equal(result.emulator.firestorePort, 8188);
  assert.equal(result.emulator.authUrl, "http://localhost:9199");
});

/* =========================================================
   3. FAIL-FAST SECURITY PROTECTION TESTS
   ========================================================= */

test("Fail-Fast: Throws security error if emulator project ID does not start with demo-", () => {
  const dangerousProjects = [
    "e-resquest",
    "production-app",
    "my-firebase-app",
    "prod-demo",
    "test-project"
  ];

  for (const projectId of dangerousProjects) {
    assert.throws(
      () => {
        resolveFirebaseConfig({
          VITE_USE_FIREBASE_EMULATORS: "true",
          VITE_FIREBASE_EMULATOR_PROJECT_ID: projectId
        });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes("[SECURITY ERROR]") &&
          err.message.includes('starting with "demo-"')
        );
      },
      `Should have thrown security violation for project ID: "${projectId}"`
    );
  }
});

test("Fail-Fast: Throws config error if emulator host is empty", () => {
  assert.throws(
    () => {
      resolveFirebaseConfig({
        VITE_USE_FIREBASE_EMULATORS: "true",
        VITE_FIREBASE_EMULATOR_HOST: "   "
      });
    },
    (err) => {
      return (
        err instanceof Error &&
        err.message.includes("[CONFIG ERROR]") &&
        err.message.includes("Emulator host must not be empty")
      );
    }
  );
});

test("Fail-Fast: Throws config error for invalid Auth ports", () => {
  const invalidPorts = ["abc", "0", "-1", "70000", "999999"];

  for (const port of invalidPorts) {
    assert.throws(
      () => {
        resolveFirebaseConfig({
          VITE_USE_FIREBASE_EMULATORS: "true",
          VITE_FIREBASE_AUTH_EMULATOR_PORT: port
        });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes("[CONFIG ERROR]") &&
          err.message.includes("Invalid Auth emulator port")
        );
      },
      `Should have failed for auth port "${port}"`
    );
  }
});

test("Fail-Fast: Throws config error for invalid Firestore ports", () => {
  const invalidPorts = ["xyz", "0", "-5", "65536", "100000"];

  for (const port of invalidPorts) {
    assert.throws(
      () => {
        resolveFirebaseConfig({
          VITE_USE_FIREBASE_EMULATORS: "true",
          VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: port
        });
      },
      (err) => {
        return (
          err instanceof Error &&
          err.message.includes("[CONFIG ERROR]") &&
          err.message.includes("Invalid Firestore emulator port")
        );
      },
      `Should have failed for firestore port "${port}"`
    );
  }
});

/* =========================================================
   4. CREDENTIAL LEAKAGE PREVENTION TESTS
   ========================================================= */

test("Security: Emulator configuration contains ZERO production credentials", () => {
  const result = resolveFirebaseConfig({
    VITE_USE_FIREBASE_EMULATORS: "true"
  });

  assert.notEqual(result.config.apiKey, PRODUCTION_FIREBASE_CONFIG.apiKey);
  assert.notEqual(result.config.projectId, PRODUCTION_FIREBASE_CONFIG.projectId);
  assert.notEqual(result.config.authDomain, PRODUCTION_FIREBASE_CONFIG.authDomain);
  assert.notEqual(result.config.storageBucket, PRODUCTION_FIREBASE_CONFIG.storageBucket);
  assert.notEqual(result.config.messagingSenderId, PRODUCTION_FIREBASE_CONFIG.messagingSenderId);
  assert.notEqual(result.config.appId, PRODUCTION_FIREBASE_CONFIG.appId);

  assert.equal(result.config.apiKey, "demo-api-key");
  assert.equal(result.config.messagingSenderId, "000000000000");
});
