import { useEffect, useState } from "react";
import {
  Navigate,
  Outlet
} from "react-router-dom";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  getDoc
} from "firebase/firestore";

import {
  auth,
  db
} from "../../../firebase/firebaseConfig";

import {
  DEFAULT_ADMIN_EMAIL,
  AUTHORIZED_ADMIN_EMAILS
} from "../services/authService";


function ProtectedRoute() {

  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);


  useEffect(() => {

    let isMounted = true;


    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {

        if (!isMounted) {
          return;
        }


        if (!user) {

          setIsAuthorized(false);
          setLoading(false);

          return;
        }

        const userEmail = (user.email || "").toLowerCase();
        const isDesignatedAdmin =
          userEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
          AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === userEmail);

        try {

          const adminRef = doc(
            db,
            "admins",
            user.uid
          );


          const adminSnapshot =
            await getDoc(adminRef);


          if (!isMounted) {
            return;
          }


          const authorized =
            (adminSnapshot.exists() &&
              adminSnapshot.data().role === "admin") ||
            isDesignatedAdmin;


          setIsAuthorized(authorized);


        } catch (error) {

          console.warn(
            "Admin authorization check note:",
            error?.message || error
          );


          if (isMounted) {
            setIsAuthorized(isDesignatedAdmin);
          }


        } finally {

          if (isMounted) {
            setLoading(false);
          }

        }

      }
    );


    return () => {

      isMounted = false;

      unsubscribe();

    };

  }, []);


  if (loading) {

    return (
      <div className="admin-splash-screen">
        <div className="admin-splash-logo-container">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="E-ReQuest Logo"
            className="admin-splash-logo-img"
          />
        </div>
        <div className="admin-splash-text">
          Checking administrator access...
        </div>
      </div>
    );

  }


  if (!isAuthorized) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );

  }


  return <Outlet />;

}


export default ProtectedRoute;