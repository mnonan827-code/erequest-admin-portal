import {
  createContext,
  useContext
} from "react";

import {
  DEFAULT_PROFILE,
  updateAdminProfile,
  getAdminProfile,
  getInitials
} from "../services/profileService";

import { auth } from "../../../firebase/firebaseConfig";

export const AdminProfileContext = createContext(null);

/**
 * Custom hook to access real-time synchronized admin profile.
 */
export function useAdminProfile() {
  const context = useContext(AdminProfileContext);
  if (!context) {
    // Graceful memory-only fallback if called outside provider
    const fallbackProfile = {
      ...DEFAULT_PROFILE,
      email: auth?.currentUser?.email || DEFAULT_PROFILE.email
    };
    return {
      profile: fallbackProfile,
      loading: false,
      error: null,
      isSyncing: false,
      lastSyncTime: null,
      initials: getInitials(fallbackProfile.name),
      updateProfile: updateAdminProfile,
      refreshProfile: getAdminProfile
    };
  }
  return context;
}

/**
 * Dedicated hook meeting the required name `useAdminProfileSync`.
 */
export function useAdminProfileSync() {
  return useAdminProfile();
}

export default AdminProfileContext;
