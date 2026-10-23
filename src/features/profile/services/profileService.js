import {
  doc,
  getDoc,
  setDoc
} from "firebase/firestore";

import { updateProfile as updateAuthProfile } from "firebase/auth";

import {
  auth,
  db
} from "../../../firebase/firebaseConfig.js";

import {
  DEFAULT_ADMIN_EMAIL
} from "../../auth/services/authService.js";

import { addActivityLog } from "../../dashboard/services/activityLogService.js";

export const DEFAULT_PROFILE = {
  name: "Admin User",
  position: "System Administrator",
  department: "Registrar's Office",
  email: DEFAULT_ADMIN_EMAIL,
  phone: "",
  role: "Administrator"
};

export const PRESET_DEPARTMENTS = [
  "Registrar's Office",
  "Admissions Office",
  "Accounting & Finance Office",
  "Information Technology Department",
  "Student Affairs & Services (SAS)",
  "Academic Affairs (OVPAA)",
  "College of Computer Studies",
  "College of Business Administration",
  "College of Education & Arts",
  "Guidance & Counseling Center"
];

export const PRESET_POSITIONS = [
  "System Administrator",
  "Registrar Officer",
  "Records Custodian",
  "Admissions Officer",
  "Accounting Officer",
  "Department Head",
  "Administrative Assistant",
  "Student Services Coordinator"
];

const PROFILE_STORAGE_PREFIX = "erequest_admin_profile_";
const ACTIVE_PROFILE_STORAGE_KEY = "erequest_admin_active_profile";
const PROFILE_UPDATE_EVENT = "admin-profile-updated";

/**
 * Extracts 1 or 2 uppercase initials from a full name.
 * e.g., "Juan Dela Cruz" -> "JC" (first and last), "Admin User" -> "AU", "Registrar" -> "R"
 */
export function getInitials(name = "") {
  const clean = String(name || "").trim();
  if (!clean) return "A";

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return (first + last).toUpperCase();
}

/**
 * Validates admin profile inputs.
 * Ensures name, position, and department are present and properly formatted.
 */
export function validateProfile(data = {}) {
  const errors = {};

  const name = String(data.name || "").trim();
  const position = String(data.position || "").trim();
  const department = String(data.department || "").trim();

  if (!name) {
    errors.name = "Full name is required.";
  } else if (name.length < 2) {
    errors.name = "Full name must be at least 2 characters.";
  }

  if (!position) {
    errors.position = "Position / designation is required.";
  } else if (position.length < 2) {
    errors.position = "Position must be at least 2 characters.";
  }

  if (!department) {
    errors.department = "Department / office is required.";
  } else if (department.length < 2) {
    errors.department = "Department must be at least 2 characters.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Resolves the appropriate cache key for localStorage.
 */
function getStorageKey(userId) {
  if (userId) {
    return `${PROFILE_STORAGE_PREFIX}${userId}`;
  }
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    return `${PROFILE_STORAGE_PREFIX}${currentUid}`;
  }
  return ACTIVE_PROFILE_STORAGE_KEY;
}

/**
 * Retrieves the cached admin profile from localStorage.
 */
export function getCachedAdminProfile(userId) {
  try {
    if (typeof localStorage !== "undefined") {
      const key = getStorageKey(userId);
      const raw = localStorage.getItem(key) || localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PROFILE,
          ...parsed,
          email: auth.currentUser?.email || parsed.email || DEFAULT_ADMIN_EMAIL
        };
      }
    }
  } catch (err) {
    console.warn("Could not read cached admin profile:", err);
  }

  return {
    ...DEFAULT_PROFILE,
    email: auth.currentUser?.email || DEFAULT_ADMIN_EMAIL
  };
}

/**
 * Saves profile data to local cache.
 */
export function cacheAdminProfile(profileData, userId) {
  try {
    if (typeof localStorage !== "undefined") {
      const serialized = JSON.stringify(profileData);
      const key = getStorageKey(userId);
      localStorage.setItem(key, serialized);
      localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn("Could not cache admin profile:", err);
  }
}

/**
 * Loads the admin profile from Firestore (admins/{userId}), falling back to cache.
 */
export async function getAdminProfile(userId) {
  const currentUid = userId || auth.currentUser?.uid;
  const currentEmail = auth.currentUser?.email || DEFAULT_ADMIN_EMAIL;
  const cached = getCachedAdminProfile(currentUid);

  if (!currentUid) {
    return cached;
  }

  try {
    const adminDocRef = doc(db, "admins", currentUid);
    const snap = await getDoc(adminDocRef);

    if (snap.exists()) {
      const data = snap.data();
      const resolvedProfile = {
        name: data.name || auth.currentUser?.displayName || cached.name || DEFAULT_PROFILE.name,
        position: data.position || cached.position || DEFAULT_PROFILE.position,
        department: data.department || cached.department || DEFAULT_PROFILE.department,
        email: data.email || currentEmail,
        phone: data.phone || cached.phone || "",
        role: data.role === "admin" ? "Administrator" : (data.role || "Administrator"),
        updatedAt: data.updatedAt || cached.updatedAt || null
      };

      cacheAdminProfile(resolvedProfile, currentUid);
      return resolvedProfile;
    }
  } catch (err) {
    console.warn("Firestore admin profile read notice:", err.message);
  }

  return cached;
}

/**
 * Updates the admin profile with name, position, and department in Firestore and local state.
 */
export async function updateAdminProfile(updatedFields = {}, userId) {
  const currentUid = userId || auth.currentUser?.uid;
  const currentEmail = auth.currentUser?.email || DEFAULT_ADMIN_EMAIL;

  const currentProfile = getCachedAdminProfile(currentUid);

  const cleanName = String(updatedFields.name ?? currentProfile.name).trim();
  const cleanPosition = String(updatedFields.position ?? currentProfile.position).trim();
  const cleanDepartment = String(updatedFields.department ?? currentProfile.department).trim();
  const cleanPhone = String(updatedFields.phone ?? currentProfile.phone ?? "").trim();

  // 1. Validation
  const validation = validateProfile({
    name: cleanName,
    position: cleanPosition,
    department: cleanDepartment
  });

  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || "Invalid profile data.");
  }

  const nowIso = new Date().toISOString();

  const fullProfile = {
    ...currentProfile,
    name: cleanName,
    position: cleanPosition,
    department: cleanDepartment,
    phone: cleanPhone,
    email: currentEmail,
    role: "Administrator",
    updatedAt: nowIso
  };

  // 2. Persist to Firestore if authenticated
  let firestoreSaved = false;
  if (currentUid) {
    try {
      const adminDocRef = doc(db, "admins", currentUid);
      await setDoc(
        adminDocRef,
        {
          name: cleanName,
          position: cleanPosition,
          department: cleanDepartment,
          phone: cleanPhone,
          email: currentEmail,
          role: "admin",
          updatedAt: nowIso
        },
        { merge: true }
      );
      firestoreSaved = true;
    } catch (err) {
      console.warn("Firestore admin profile write notice:", err.message);
    }
  }

  // 3. Update Firebase Auth displayName if available
  if (auth.currentUser && auth.currentUser.displayName !== cleanName) {
    try {
      await updateAuthProfile(auth.currentUser, { displayName: cleanName });
    } catch (authErr) {
      console.warn("Auth displayName update notice:", authErr.message);
    }
  }

  // 4. Update local cache
  cacheAdminProfile(fullProfile, currentUid);

  // 5. Broadcast change event across application
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent(PROFILE_UPDATE_EVENT, { detail: fullProfile })
      );
    } catch {
      // Ignore if event dispatch fails in restricted environments
    }
  }

  // 6. Record activity log if possible
  try {
    await addActivityLog({
      type: "admin_profile",
      action: "updated",
      title: `Profile updated for ${cleanName}`,
      description: `Position: ${cleanPosition} | Department: ${cleanDepartment}`,
      recordId: currentUid || "admin"
    });
  } catch (logErr) {
    console.warn("Profile activity log notice:", logErr.message);
  }

  return {
    success: true,
    profile: fullProfile,
    firestoreSaved
  };
}

/**
 * Registers a listener callback for profile updates.
 * Returns an unsubscribe function.
 */
export function onAdminProfileChange(callback) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }

  const handler = (event) => {
    if (event?.detail) {
      callback(event.detail);
    }
  };

  window.addEventListener(PROFILE_UPDATE_EVENT, handler);
  return () => {
    window.removeEventListener(PROFILE_UPDATE_EVENT, handler);
  };
}
