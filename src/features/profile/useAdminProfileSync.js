import {
  useContext,
  useEffect,
  useState,
  useCallback
} from "react";

import { AdminProfileContext } from "./AdminProfileContext";

import {
  DEFAULT_PROFILE,
  subscribeToAdminProfile,
  updateAdminProfile,
  getAdminProfile,
  getInitials
} from "./profileService";

import { auth } from "../../firebase/firebaseConfig";

/**
 * Custom React Hook: useAdminProfileSync
 *
 * Cloud-First Firestore real-time synchronization hook for admin profile state.
 * If used within an <AdminProfileProvider>, it reuses the centralized Firestore subscription.
 * If used standalone, it establishes an onSnapshot listener and cleanly unsubscribes on unmount.
 *
 * @param {string|null} [customUid=null] - Optional specific admin UID.
 * @returns {object} { profile, loading, error, isSyncing, initials, updateProfile, refreshProfile }
 */
export function useAdminProfileSync(customUid = null) {
  const context = useContext(AdminProfileContext);

  // Standalone state when used outside provider
  const [standaloneProfile, setStandaloneProfile] = useState(() => ({
    ...DEFAULT_PROFILE,
    email: auth?.currentUser?.email || DEFAULT_PROFILE.email
  }));
  const [standaloneLoading, setStandaloneLoading] = useState(true);
  const [standaloneError, setStandaloneError] = useState(null);
  const [standaloneSyncing, setStandaloneSyncing] = useState(false);

  useEffect(() => {
    // If inside AdminProfileProvider and no custom UID is specified, delegate to provider
    if (context && !customUid) return;

    let isMounted = true;

    const unsubscribe = subscribeToAdminProfile(
      customUid,
      (liveProfile) => {
        if (!isMounted) return;
        setStandaloneProfile(liveProfile);
        setStandaloneLoading(false);
        setStandaloneSyncing(false);
        setStandaloneError(null);
      },
      (err) => {
        if (!isMounted) return;
        setStandaloneError(err);
        setStandaloneLoading(false);
        setStandaloneSyncing(false);
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [context, customUid]);

  const handleUpdate = useCallback(
    async (updatedFields) => {
      if (context && !customUid) {
        return context.updateProfile(updatedFields);
      }
      setStandaloneSyncing(true);
      try {
        const res = await updateAdminProfile(updatedFields, customUid);
        if (res.success && res.profile) {
          setStandaloneProfile(res.profile);
        }
        setStandaloneSyncing(false);
        return res;
      } catch (err) {
        setStandaloneSyncing(false);
        throw err;
      }
    },
    [context, customUid]
  );

  if (context && !customUid) {
    return context;
  }

  return {
    profile: standaloneProfile,
    loading: standaloneLoading,
    error: standaloneError,
    isSyncing: standaloneSyncing,
    initials: getInitials(standaloneProfile?.name || DEFAULT_PROFILE.name),
    updateProfile: handleUpdate,
    refreshProfile: () => getAdminProfile(customUid)
  };
}

export default useAdminProfileSync;
