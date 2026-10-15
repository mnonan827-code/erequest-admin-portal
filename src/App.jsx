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

const EditTransactionPage =
  lazy(() => import("./features/transactions/pages/EditTransactionPage"));

const ManageTransactionPage =
  lazy(() => import("./features/transactions/pages/ManageTransactionPage"));

const AnnouncementsPage =
  lazy(() => import("./features/announcements/pages/AnnouncementsPage"));

const AddAnnouncementPage =
  lazy(() => import("./features/announcements/pages/AddAnnouncementPage"));

const RequirementsPage =
  lazy(() => import("./features/requirements/pages/RequirementsPage"));

function RouteLoadingFallback() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#244f7c",
        fontFamily: "Inter, Arial, Helvetica, sans-serif",
        fontSize: "15px"
      }}
    >
      Loading...
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
              element={<EditTransactionPage />}
            />


            {/* MANAGE TRANSACTION */}

            <Route
              path="/transactions/manage/:transactionId"
              element={<ManageTransactionPage />}
            />


            {/* REQUIREMENTS */}

            <Route
              path="/requirements"
              element={<RequirementsPage />}
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