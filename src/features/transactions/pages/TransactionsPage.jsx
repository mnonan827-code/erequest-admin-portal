import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getAllTransactions,
  getActiveServices,
  setTransactionActiveStatus,
  deleteTransaction,
  getTransactionChildCounts
} from "../services/transactionService";

import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";

import "../components/TransactionsPage.css";


function TransactionsPage() {
  const navigate = useNavigate();

  const [transactions, setTransactions] =
    useState([]);

  const [services, setServices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [deletingId, setDeletingId] =
    useState(null);

  const [transactionToDelete, setTransactionToDelete] =
    useState(null);

  const [isBlocked, setIsBlocked] =
    useState(false);

  const [blockedDetails, setBlockedDetails] =
    useState([]);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [serviceFilter, setServiceFilter] =
    useState("");

  const [searchQuery, setSearchQuery] =
    useState("");


  /* =========================================================
     LOAD DATA
     ========================================================= */

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        transactionData,
        serviceData
      ] = await Promise.all([
        getAllTransactions(),
        getActiveServices()
      ]);

      setTransactions(transactionData);
      setServices(serviceData);

    } catch (error) {
      console.error(
        "Failed to load transactions:",
        error
      );

      setErrorMessage(
        "Unable to load transactions."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [
          transactionData,
          serviceData
        ] = await Promise.all([
          getAllTransactions(),
          getActiveServices()
        ]);

        if (!ignore) {
          setTransactions(transactionData);
          setServices(serviceData);
        }

      } catch (error) {
        console.error(
          "Failed to load transactions:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load transactions."
          );
        }

      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, []);


  /* =========================================================
     NAVIGATION
     ========================================================= */

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };


  const handleAddTransaction = () => {
    navigate("/transactions/add");
  };


  const handleEdit = (transaction) => {
    navigate(
      `/transactions/edit/${transaction.id}`
    );
  };


  const handleManage = (transaction) => {
    navigate(
      `/transactions/manage/${transaction.id}`
    );
  };


  /* =========================================================
     SERVICE NAME
     ========================================================= */

  const getServiceName = (
    transactionServiceId
  ) => {
    const service =
      services.find(
        (item) =>
          item.id === transactionServiceId
      );

    return service
      ? service.name
      : transactionServiceId ||
          "Unknown Service";
  };


  /* =========================================================
     ACTIVATE / DEACTIVATE
     ========================================================= */

  const handleStatusChange = async (
    transaction
  ) => {
    const newStatus =
      !transaction.isActive;

    try {
      setUpdatingId(
        transaction.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      await setTransactionActiveStatus(
        transaction.id,
        newStatus
      );

      setSuccessMessage(
        newStatus
          ? `${transaction.name} activated successfully.`
          : `${transaction.name} deactivated successfully.`
      );

      await loadData();

    } catch (error) {
      console.error(
        "Failed to update transaction status:",
        error
      );

      setErrorMessage(
        "Unable to update transaction status."
      );

    } finally {
      setUpdatingId(null);
    }
  };


  /* =========================================================
     OPEN DELETE CONFIRMATION
     ========================================================= */

  const handleDelete = async (
    transaction
  ) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setUpdatingId(transaction.id);

      const counts =
        await getTransactionChildCounts(transaction.id);

      if (counts.total > 0) {
        const details = [];

        if (counts.requirements > 0) {
          details.push(
            `${counts.requirements} Requirement(s)`
          );
        }

        if (counts.procedures > 0) {
          details.push(
            `${counts.procedures} Procedure Step(s)`
          );
        }

        if (counts.guidelines > 0) {
          details.push(
            `${counts.guidelines} Guideline(s)`
          );
        }

        setIsBlocked(true);
        setBlockedDetails(details);
      } else {
        setIsBlocked(false);
        setBlockedDetails([]);
      }

      setTransactionToDelete(
        transaction
      );
    } catch (error) {
      console.error(
        "Failed to verify transaction child records:",
        error
      );

      setIsBlocked(false);
      setBlockedDetails([]);
      setTransactionToDelete(
        transaction
      );
    } finally {
      setUpdatingId(null);
    }
  };


  /* =========================================================
     CANCEL DELETE
     ========================================================= */

  const handleCancelDelete = () => {
    if (deletingId) {
      return;
    }

    setTransactionToDelete(null);
    setIsBlocked(false);
    setBlockedDetails([]);
  };


  /* =========================================================
     CONFIRM PERMANENT DELETE
     ========================================================= */

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) {
      return;
    }

    try {
      setDeletingId(
        transactionToDelete.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      await deleteTransaction(
        transactionToDelete.id
      );

      setSuccessMessage(
        `${transactionToDelete.name} deleted successfully.`
      );

      setTransactionToDelete(null);

      await loadData();

    } catch (error) {
      console.error(
        "Failed to delete transaction:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to delete transaction."
      );

    } finally {
      setDeletingId(null);
    }
  };


  /* =========================================================
     FILTER (SERVICE + SEARCH QUERY)
     ========================================================= */

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (serviceFilter && transaction.serviceId !== serviceFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const clean = searchQuery.toLowerCase().trim();
        const service = services.find(
          (s) => s.id === transaction.serviceId
        );
        const serviceName = (service?.name || "").toLowerCase();
        const name = (transaction.name || "").toLowerCase();
        const desc = (transaction.description || "").toLowerCase();
        const office = (transaction.officeName || "").toLowerCase();
        const schedule = (transaction.officeSchedule || "").toLowerCase();

        const match =
          name.includes(clean) ||
          desc.includes(clean) ||
          office.includes(clean) ||
          schedule.includes(clean) ||
          serviceName.includes(clean);

        if (!match) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, serviceFilter, searchQuery, services]);


  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="transactions-page">

      <div className="transactions-container">

        {/* BACK TO DASHBOARD */}

        <button
          type="button"
          onClick={handleBackToDashboard}
          style={{
            background: "transparent",
            border: "none",
            padding: "0",
            marginBottom: "18px",
            color: "#174a78",
            fontSize: "15px",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span aria-hidden="true">
            ←
          </span>

          Back to Dashboard
        </button>


        {/* HEADER */}

        <header className="transactions-header">

          <div className="transactions-header-content">

            <div>
              <h1>
                Transactions / Documents
              </h1>

              <p>
                Manage school transactions and
                documents available in E-ReQuest.
              </p>
            </div>


            <div className="transactions-header-actions">

              {/* CONTEXTUAL SEARCH BAR */}
              <div className="transactions-search-bar">

                <span
                  className="transactions-search-icon"
                  aria-hidden="true"
                >
                  🔍
                </span>

                <input
                  type="text"
                  className="transactions-search-input"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  aria-label="Search transactions"
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="transactions-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>


              <button
                type="button"
                className="transaction-primary-button"
                onClick={handleAddTransaction}
              >
                + Add Transaction / Document
              </button>

            </div>

          </div>

        </header>


        {/* MESSAGES */}

        {errorMessage && (
          <div className="transaction-error transaction-page-message">
            {errorMessage}
          </div>
        )}


        {successMessage && (
          <div className="transaction-success transaction-page-message">
            {successMessage}
          </div>
        )}


        {/* TRANSACTION LIST */}

        <section className="transactions-card">

          <div className="transaction-list-heading">

            <div>
              <h2>
                Available Transactions / Documents
              </h2>

              <p>
                Select a transaction to manage or
                edit its information.
              </p>
            </div>


            {/* FILTER */}

            <div className="transaction-service-filter">

              <label htmlFor="serviceFilter">
                Service
              </label>

              <select
                id="serviceFilter"
                value={serviceFilter}
                onChange={(event) =>
                  setServiceFilter(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All Services
                </option>

                {services.map(
                  (service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>


          {/* CONTENT */}

          {loading ? (

            <p className="transactions-state-message">
              Loading transactions...
            </p>

          ) : filteredTransactions.length === 0 ? (

            <p className="transactions-state-message">
              {searchQuery || serviceFilter
                ? "No transactions found matching your criteria."
                : "No transactions found."}
            </p>

          ) : (

            <div className="transactions-list">

              {filteredTransactions.map(
                (transaction) => (

                  <article
                    key={transaction.id}
                    className="transaction-item"
                  >

                    {/* TOP */}

                    <div className="transaction-item-top">

                      {/* INFORMATION */}

                      <div className="transaction-information">

                        <h3>
                          {transaction.name}
                        </h3>

                        <div className="transaction-service">
                          {getServiceName(
                            transaction.serviceId
                          )}
                        </div>

                        <p className="transaction-description">
                          {transaction.description ||
                            "No description"}
                        </p>


                        <div className="transaction-office-info">

                          <p>
                            <strong>
                              Office:
                            </strong>{" "}

                            {transaction.officeName ||
                              "Not specified"}
                          </p>

                          <p>
                            <strong>
                              Schedule:
                            </strong>{" "}

                            {transaction.officeSchedule ||
                              "Not specified"}
                          </p>

                        </div>

                      </div>


                      {/* STATUS */}

                      <span
                        className={
                          transaction.isActive
                            ? "transaction-status active"
                            : "transaction-status inactive"
                        }
                      >
                        {transaction.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </div>


                    {/* ACTION BUTTONS */}

                    <div className="transaction-item-actions">

                      {/* MANAGE */}

                      <button
                        type="button"
                        className="transaction-manage-button"
                        onClick={() =>
                          handleManage(
                            transaction
                          )
                        }
                        disabled={
                          deletingId ===
                          transaction.id
                        }
                      >
                        Manage
                      </button>


                      {/* EDIT */}

                      <button
                        type="button"
                        className="transaction-edit-button"
                        onClick={() =>
                          handleEdit(
                            transaction
                          )
                        }
                        disabled={
                          deletingId ===
                          transaction.id
                        }
                      >
                        Edit Info
                      </button>


                      {/* ACTIVATE / DEACTIVATE */}

                      <button
                        type="button"
                        className="transaction-status-button"
                        onClick={() =>
                          handleStatusChange(
                            transaction
                          )
                        }
                        disabled={
                          updatingId ===
                            transaction.id ||
                          deletingId ===
                            transaction.id
                        }
                      >
                        {updatingId ===
                        transaction.id
                          ? "Updating..."
                          : transaction.isActive
                            ? "Deactivate"
                            : "Activate"}
                      </button>


                      {/* DELETE */}

                      <button
                        type="button"
                        className="transaction-delete-button"
                        onClick={() =>
                          handleDelete(
                            transaction
                          )
                        }
                        disabled={
                          deletingId ===
                            transaction.id ||
                          updatingId ===
                            transaction.id
                        }
                      >
                        {deletingId ===
                        transaction.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </section>

      </div>


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      <DeleteConfirmationModal
        isOpen={
          transactionToDelete !== null
        }
        itemType="Transaction"
        itemName={
          transactionToDelete?.name || ""
        }
        deleting={
          deletingId !== null
        }
        isBlocked={isBlocked}
        blockedDetails={blockedDetails}
        recommendation="Please remove these records first, or use Deactivate instead."
        onCancel={
          handleCancelDelete
        }
        onConfirm={
          handleConfirmDelete
        }
      />

    </div>
  );
}


export default TransactionsPage;