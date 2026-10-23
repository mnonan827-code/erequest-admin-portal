import {
  lazy,
  Suspense
} from "react";

import {
  HashRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import ProtectedRoute
  from "./features/auth/components/ProtectedRoute";

import AdminLayout
  from "./layouts/AdminLayout";

const LoginPage =
  lazy(() => import("./features/auth/pages/LoginPage"));

const DashboardPage =
  lazy(() => import("./features/dashboard/pages/DashboardPage"));

const ServicesPage =
  lazy(() => import("./features/services/pages/ServicesPage"));

const AddServicePage =
  lazy(() => import("./features/services/pages/AddServicePage"));

const TransactionsPage =
  lazy(() => import("./features/transactions/pages/TransactionsPage"));

const AddTransactionPage =
  lazy(() => import("./features/transactions/pages/AddTransactionPage"));

const AnnouncementsPage =
  lazy(() => import("./features/announcements/pages/AnnouncementsPage"));

const AddAnnouncementPage =
  lazy(() => import("./features/announcements/pages/AddAnnouncementPage"));

const AdminProfilePage =
  lazy(() => import("./features/profile/pages/AdminProfilePage"));

function RouteLoadingFallback() {
  return (
    <div className="admin-splash-screen" style={{ minHeight: "60vh", background: "transparent" }}>
      <div className="admin-splash-logo-container" style={{ width: "54px", height: "54px" }}>
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="E-ReQuest Logo"
          className="admin-splash-logo-img"
        />
      </div>
      <div className="admin-splash-text" style={{ fontSize: "14px" }}>
        Loading...
      </div>
    </div>
  );
}

function App() {

  return (

    <HashRouter>

      <Suspense fallback={<RouteLoadingFallback />}>

      <Routes>


        {/* =====================================================
            DEFAULT
            ===================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


        {/* =====================================================
            LOGIN
            ===================================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />


        {/* =====================================================
            PROTECTED ADMIN ROUTES
            ===================================================== */}

        <Route element={<ProtectedRoute />}>

          <Route element={<AdminLayout />}>


            {/* DASHBOARD */}

            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />


            {/* SERVICES */}

            <Route
              path="/services"
              element={<ServicesPage />}
            />


            {/* ADD SERVICE */}

            <Route
              path="/services/add"
              element={<AddServicePage />}
            />


            {/* EDIT SERVICE */}

            <Route
              path="/services/edit/:serviceId"
              element={<AddServicePage />}
            />


            {/* TRANSACTIONS */}

            <Route
              path="/transactions"
              element={<TransactionsPage />}
            />


            {/* ADD TRANSACTION */}

            <Route
              path="/transactions/add"
              element={<AddTransactionPage />}
            />


            {/* EDIT TRANSACTION */}

            <Route
              path="/transactions/edit/:transactionId"
              element={<AddTransactionPage />}
            />


            {/* MANAGE TRANSACTION */}

            <Route
              path="/transactions/manage/:transactionId"
              element={<AddTransactionPage />}
            />


            {/* REDIRECT LEGACY REQUIREMENTS */}

            <Route
              path="/requirements"
              element={
                <Navigate
                  to="/transactions"
                  replace
                />
              }
            />


            {/* ANNOUNCEMENTS */}

            <Route
              path="/announcements"
              element={<AnnouncementsPage />}
            />


            {/* ADD ANNOUNCEMENT */}

            <Route
              path="/announcements/add"
              element={<AddAnnouncementPage />}
            />


            {/* EDIT ANNOUNCEMENT */}

            <Route
              path="/announcements/edit/:announcementId"
              element={<AddAnnouncementPage />}
            />


            {/* ADMIN PROFILE */}

            <Route
              path="/profile"
              element={<AdminProfilePage />}
            />


          </Route>

        </Route>


        {/* =====================================================
            UNKNOWN ROUTE
            ===================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />


      </Routes>

      </Suspense>

    </HashRouter>

  );

}


export default App;