import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PROFILE,
  PRESET_DEPARTMENTS,
  PRESET_POSITIONS,
  getInitials,
  validateProfile,
  getCachedAdminProfile,
  cacheAdminProfile,
  normalizeProfileData,
  subscribeToAdminProfile
} from "../src/features/profile/services/profileService.js";

test("Profile Constants: DEFAULT_PROFILE contains required name, position, department fields", () => {
  assert.ok(DEFAULT_PROFILE, "DEFAULT_PROFILE must exist");
  assert.equal(DEFAULT_PROFILE.name, "Admin User");
  assert.equal(DEFAULT_PROFILE.position, "System Administrator");
  assert.equal(DEFAULT_PROFILE.department, "Registrar's Office");
  assert.equal(DEFAULT_PROFILE.role, "Administrator");
  assert.ok(DEFAULT_PROFILE.email, "Default email should be present");
});

test("Profile Presets: Contains list of school departments and positions", () => {
  assert.ok(Array.isArray(PRESET_DEPARTMENTS) && PRESET_DEPARTMENTS.length >= 5);
  assert.ok(PRESET_DEPARTMENTS.includes("Registrar's Office"));
  assert.ok(PRESET_DEPARTMENTS.includes("Admissions Office"));

  assert.ok(Array.isArray(PRESET_POSITIONS) && PRESET_POSITIONS.length >= 5);
  assert.ok(PRESET_POSITIONS.includes("System Administrator"));
  assert.ok(PRESET_POSITIONS.includes("Registrar Officer"));
});

test("Initials Helper: Extracts correct 1 or 2 letter uppercase initials", () => {
  assert.equal(getInitials("Admin User"), "AU");
  assert.equal(getInitials("Juan Dela Cruz"), "JC");
  assert.equal(getInitials("Registrar"), "RE");
  assert.equal(getInitials("John"), "JO");
  assert.equal(getInitials("Dr. Alan Turing"), "DT");
  assert.equal(getInitials(""), "A");
  assert.equal(getInitials("   "), "A");
  assert.equal(getInitials(null), "A");
  assert.equal(getInitials(undefined), "A");
});

test("Profile Validation: Successfully validates valid profile payload", () => {
  const result = validateProfile({
    name: "Maria Santos",
    position: "Senior Registrar",
    department: "Registrar's Office"
  });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test("Profile Validation: Flags missing or empty required fields", () => {
  // Missing name
  const noName = validateProfile({
    name: "   ",
    position: "Registrar Officer",
    department: "Registrar's Office"
  });
  assert.equal(noName.isValid, false);
  assert.ok(noName.errors.name, "Expected error on missing name");

  // Missing position
  const noPos = validateProfile({
    name: "Maria Santos",
    position: "",
    department: "Registrar's Office"
  });
  assert.equal(noPos.isValid, false);
  assert.ok(noPos.errors.position, "Expected error on missing position");

  // Missing department
  const noDept = validateProfile({
    name: "Maria Santos",
    position: "Registrar Officer",
    department: "   "
  });
  assert.equal(noDept.isValid, false);
  assert.ok(noDept.errors.department, "Expected error on missing department");
});

test("Profile Validation: Enforces minimum character length bounds", () => {
  const shortFields = validateProfile({
    name: "M",
    position: "R",
    department: "D"
  });

  assert.equal(shortFields.isValid, false);
  assert.ok(shortFields.errors.name);
  assert.ok(shortFields.errors.position);
  assert.ok(shortFields.errors.department);
});

test("Profile Cache: Manages fallback and localStorage integration", () => {
  // Mock localStorage for Node.js test environment
  const mockStorage = new Map();
  globalThis.localStorage = {
    getItem: (key) => mockStorage.get(key) || null,
    setItem: (key, val) => mockStorage.set(key, String(val)),
    removeItem: (key) => mockStorage.delete(key),
    clear: () => mockStorage.clear()
  };

  const initial = getCachedAdminProfile("test_admin_uid");
  assert.equal(initial.name, DEFAULT_PROFILE.name);
  assert.equal(initial.position, DEFAULT_PROFILE.position);
  assert.equal(initial.department, DEFAULT_PROFILE.department);

  // Cache updated profile
  const updatedData = {
    name: "Prof. Ricardo Dalisay",
    position: "Head Administrator",
    department: "Admissions Office",
    email: "erequesticctadmin@gmail.com",
    role: "Administrator"
  };

  cacheAdminProfile(updatedData, "test_admin_uid");

  const retrieved = getCachedAdminProfile("test_admin_uid");
  assert.equal(retrieved.name, "Prof. Ricardo Dalisay");
  assert.equal(retrieved.position, "Head Administrator");
  assert.equal(retrieved.department, "Admissions Office");
});

test("Real-time Normalization: Normalizes remote Firestore snapshot data with defaults", () => {
  const remoteSnapshot = {
    name: "Dr. Maria Clara",
    position: "Chief Registrar",
    department: "Registrar's Office",
    role: "admin",
    updatedAt: "2026-10-24T04:00:00.000Z"
  };

  const normalized = normalizeProfileData(remoteSnapshot, "admin_uid_123");
  assert.equal(normalized.name, "Dr. Maria Clara");
  assert.equal(normalized.position, "Chief Registrar");
  assert.equal(normalized.department, "Registrar's Office");
  assert.equal(normalized.role, "Administrator");
  assert.equal(normalized.updatedAt, "2026-10-24T04:00:00.000Z");
});

test("Real-time Subscription: subscribeToAdminProfile handles invalid callback safely", () => {
  const unsubscribe = subscribeToAdminProfile(null, null);
  assert.equal(typeof unsubscribe, "function", "Expected subscribeToAdminProfile to return cleanup function");
  assert.doesNotThrow(() => unsubscribe(), "Unsubscribing should not throw");
});
