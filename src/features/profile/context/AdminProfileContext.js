import {
  createContext,
  useContext
} from "react";

import {
  DEFAULT_PROFILE,
  getCachedAdminProfile,
  updateAdminProfile,
  getAdminProfile,
  getInitials
} from "../services/profileService";

export const AdminProfileContext = createContext(null);

/**
 * Custom hook to access real-time synchronized admin profile.
 */
export function useAdminProfile() {
  const context = useContext(AdminProfileContext);
  if (!context) {
    // Graceful fallback if called outside provider
    const fallbackProfile = getCachedAdminProfile();
    return {
      profile: fallbackProfile,
      loading: false,
      error: null,
      isSyncing: false,
      lastSyncTime: null,
      initials: getInitials(fallbackProfile?.name || DEFAULT_PROFILE.name),
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
