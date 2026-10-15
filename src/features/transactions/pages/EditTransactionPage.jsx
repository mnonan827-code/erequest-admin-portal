import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams
} from "react-router-dom";

import {
  getTransactionById,
  getActiveServices,
  updateTransaction
} from "../services/transactionService";

import "../components/EditTransactionPage.css";


function EditTransactionPage() {

  const navigate = useNavigate();

  const { transactionId } =
    useParams();


  const [services, setServices] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");


  const [serviceId, setServiceId] =
    useState("");

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [officeName, setOfficeName] =
    useState("");

  const [officeSchedule, setOfficeSchedule] =
    useState("");


  /* =========================================================
     LOAD TRANSACTION AND SERVICES
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
          setErrorMessage(
            "Transaction / Document not found."
          );
          return;
        }

        setServiceId(
          selectedTransaction.serviceId || ""
        );

        setName(
          selectedTransaction.name || ""
        );

        setDescription(
          selectedTransaction.description || ""
        );

        setOfficeName(
          selectedTransaction.officeName || ""
        );

        setOfficeSchedule(
          selectedTransaction.officeSchedule || ""
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
     SAVE CHANGES
     ========================================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();

    setErrorMessage("");


    if (!serviceId) {

      setErrorMessage(
        "Please select a service."
      );

      return;

    }


    if (!name.trim()) {

      setErrorMessage(
        "Transaction / Document Name is required."
      );

      return;

    }


    try {

      setSaving(true);


      await updateTransaction(
        transactionId,
        serviceId,
        name,
        description,
        officeName,
        officeSchedule
      );


      /*
       * Return to Transactions page
       * after successful update.
       */

      navigate("/transactions", {
        replace: true
      });


    } catch (error) {

      console.error(
        "Failed to update transaction:",
        error
      );


      setErrorMessage(
        error.message ||
        "Unable to update transaction."
      );


    } finally {

      setSaving(false);

    }

  };


  /* =========================================================
     CANCEL / BACK
     ========================================================= */

  const handleCancel = () => {

    navigate("/transactions");

  };


  /* =========================================================
     UI
     ========================================================= */

  return (

    <div className="edit-transaction-page">

      <div className="edit-transaction-container">


        {/* HEADER */}

        <header className="edit-transaction-header">

          <button
            type="button"
            className="edit-transaction-back-button"
            onClick={handleCancel}
          >
            ← Back to Transactions
          </button>


          <h1>
            Edit Transaction / Document
          </h1>


          <p>
            Update the basic information of this
            transaction or document.
          </p>

        </header>



        {/* LOADING */}

        {loading ? (

          <section className="edit-transaction-card">

            <div className="edit-transaction-loading">
              Loading transaction information...
            </div>

          </section>

        ) : errorMessage &&
            !name ? (

          <section className="edit-transaction-card">

            <div className="edit-transaction-error">
              {errorMessage}
            </div>


            <button
              type="button"
              className="edit-transaction-cancel-button"
              onClick={handleCancel}
            >
              Back to Transactions
            </button>

          </section>

        ) : (

          <section className="edit-transaction-card">

            <form
              className="edit-transaction-form"
              onSubmit={handleSubmit}
            >


              {/* ERROR */}

              {errorMessage && (

                <div className="edit-transaction-error">
                  {errorMessage}
                </div>

              )}



              <div className="edit-transaction-form-grid">


                {/* SERVICE */}

                <div className="edit-transaction-form-group full-width">

                  <label htmlFor="editService">
                    Service
                  </label>

                  <select
                    id="editService"
                    value={serviceId}
                    onChange={(event) =>
                      setServiceId(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  >

                    <option value="">
                      Select a service
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



                {/* NAME */}

                <div className="edit-transaction-form-group full-width">

                  <label htmlFor="editTransactionName">
                    Transaction / Document Name
                  </label>

                  <input
                    id="editTransactionName"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  />

                </div>



                {/* DESCRIPTION */}

                <div className="edit-transaction-form-group full-width">

                  <label htmlFor="editDescription">
                    Description
                  </label>

                  <textarea
                    id="editDescription"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    rows="5"
                  />

                </div>



                {/* OFFICE NAME */}

                <div className="edit-transaction-form-group">

                  <label htmlFor="editOfficeName">
                    Office Name
                  </label>

                  <input
                    id="editOfficeName"
                    type="text"
                    value={officeName}
                    onChange={(event) =>
                      setOfficeName(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  />

                </div>



                {/* OFFICE SCHEDULE */}

                <div className="edit-transaction-form-group">

                  <label htmlFor="editOfficeSchedule">
                    Office Schedule
                  </label>

                  <input
                    id="editOfficeSchedule"
                    type="text"
                    value={officeSchedule}
                    onChange={(event) =>
                      setOfficeSchedule(
                        event.target.value
                      )
                    }
                    disabled={saving}
                  />

                </div>

              </div>



              {/* ACTIONS */}

              <div className="edit-transaction-actions">

                <button
                  type="button"
                  className="edit-transaction-cancel-button"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  className="edit-transaction-save-button"
                  disabled={saving}
                >

                  {saving
                    ? "Saving Changes..."
                    : "Save Changes"}

                </button>

              </div>

            </form>

          </section>

        )}

      </div>

    </div>

  );

}


export default EditTransactionPage;