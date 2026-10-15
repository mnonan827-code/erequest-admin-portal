import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  getTransactionById,
  getActiveServices
} from "../services/transactionService";

import RequirementsSection from "../../requirements/components/RequirementsSection";
import ProceduresSection from "../../procedures/components/ProceduresSection";
import GuidelinesSection from "../../guidelines/components/GuidelinesSection";

import "../components/TransactionsPage.css";
import "../components/ManageTransactionPage.css";


function ManageTransactionPage() {

  const navigate = useNavigate();

  const { transactionId } =
    useParams();


  const [transaction, setTransaction] =
    useState(null);

  const [services, setServices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");


  /* =========================================================
     LOAD TRANSACTION
     ========================================================= */

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const [
          selectedTransaction,
          serviceData
        ] = await Promise.all([
          getTransactionById(transactionId),
          getActiveServices()
        ]);

        if (ignore) {
          return;
        }

        setServices(serviceData);

        if (!selectedTransaction) {
          setTransaction(null);
          setErrorMessage(
            "Transaction / Document not found."
          );
          return;
        }

        setTransaction(
          selectedTransaction
        );

      } catch (error) {
        console.error(
          "Failed to load transaction:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load transaction information."
          );
        }

      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [transactionId]);


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
     NAVIGATION
     ========================================================= */

  const handleBack = () => {

    navigate("/transactions");

  };


  const handleEdit = () => {

    navigate(
      `/transactions/edit/${transactionId}`
    );

  };


  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {

    return (

      <div className="manage-transaction-page">

        <div className="manage-transaction-container">

          <div className="manage-transaction-state">
            Loading transaction...
          </div>

        </div>

      </div>

    );

  }


  /* =========================================================
     ERROR / NOT FOUND
     ========================================================= */

  if (!transaction) {

    return (

      <div className="manage-transaction-page">

        <div className="manage-transaction-container">

          <button
            type="button"
            className="manage-transaction-back-button"
            onClick={handleBack}
          >
            ← Back to Transactions
          </button>


          <div className="manage-transaction-error">

            {errorMessage ||
              "Transaction / Document not found."}

          </div>

        </div>

      </div>

    );

  }


  /* =========================================================
     UI
     ========================================================= */

  return (

    <div className="manage-transaction-page">

      <div className="manage-transaction-container">


        {/* BACK */}

        <button
          type="button"
          className="manage-transaction-back-button"
          onClick={handleBack}
        >
          ← Back to Transactions
        </button>



        {/* PAGE HEADER */}

        <header className="manage-transaction-header">

          <div>

            <p className="manage-transaction-label">
              Transaction / Document Management
            </p>


            <h1>
              {transaction.name}
            </h1>


            <p className="manage-transaction-service-name">

              {getServiceName(
                transaction.serviceId
              )}

            </p>

          </div>


          <span
            className={
              transaction.isActive
                ? "manage-transaction-status active"
                : "manage-transaction-status inactive"
            }
          >

            {transaction.isActive
              ? "Active"
              : "Inactive"}

          </span>

        </header>



        {/* ===================================================
            BASIC INFORMATION
            =================================================== */}

        <section className="transaction-detail-section">


          <div className="transaction-detail-section-header">

            <div>

              <h2>
                Basic Information
              </h2>

              <p>
                General information for this
                transaction or document.
              </p>

            </div>


            <button
              type="button"
              className="transaction-edit-button"
              onClick={handleEdit}
            >
              Edit Information
            </button>

          </div>



          <div className="transaction-basic-info-grid">


            <div>

              <span>
                Service
              </span>

              <strong>

                {getServiceName(
                  transaction.serviceId
                )}

              </strong>

            </div>


            <div>

              <span>
                Office
              </span>

              <strong>

                {transaction.officeName ||
                  "Not specified"}

              </strong>

            </div>


            <div>

              <span>
                Schedule
              </span>

              <strong>

                {transaction.officeSchedule ||
                  "Not specified"}

              </strong>

            </div>

          </div>



          <div className="transaction-basic-description">

            <span>
              Description
            </span>

            <p>

              {transaction.description ||
                "No description"}

            </p>

          </div>

        </section>



        {/* ===================================================
            REQUIREMENTS
            =================================================== */}

        <RequirementsSection
          transactionId={
            transaction.id
          }
          transactionName={
            transaction.name
          }
        />



        {/* ===================================================
            STEP-BY-STEP PROCEDURE
            =================================================== */}

        <ProceduresSection
          transactionId={
            transaction.id
          }
          transactionName={
            transaction.name
          }
        />



        {/* ===================================================
            GUIDELINES
            =================================================== */}

        <GuidelinesSection
          transactionId={
            transaction.id
          }
          transactionName={
            transaction.name
          }
        />


      </div>

    </div>

  );

}


export default ManageTransactionPage;