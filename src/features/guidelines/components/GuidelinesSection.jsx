import { useEffect, useState, useCallback } from "react";

import {
  getGuidelinesByTransactionId,
  addGuideline,
  updateGuideline,
  setGuidelineActiveStatus,
  deleteGuideline
} from "../services/guidelineService";

import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";


function GuidelinesSection({
  transactionId,
  transactionName
}) {
  const [guidelines, setGuidelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [guidelineToDelete, setGuidelineToDelete] =
    useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [guidelineText, setGuidelineText] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");

  const [editingGuideline, setEditingGuideline] =
    useState(null);


  /* =========================================================
     LOAD GUIDELINES
     ========================================================= */

  const loadGuidelines = useCallback(async () => {
    if (!transactionId) {
      setGuidelines([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const filteredGuidelines =
        await getGuidelinesByTransactionId(transactionId);

      setGuidelines(
        filteredGuidelines
      );

    } catch (error) {
      console.error(
        "Failed to load guidelines:",
        error
      );

      setErrorMessage(
        "Unable to load guidelines."
      );

    } finally {
      setLoading(false);
    }
  }, [transactionId]);


  useEffect(() => {
    if (!transactionId) {
      return;
    }

    let ignore = false;

    const fetchGuidelines = async () => {
      try {
        const filteredGuidelines =
          await getGuidelinesByTransactionId(transactionId);

        if (!ignore) {
          setGuidelines(
            filteredGuidelines
          );
        }

      } catch (error) {
        console.error(
          "Failed to load guidelines:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load guidelines."
          );
        }

      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchGuidelines();

    return () => {
      ignore = true;
    };
  }, [transactionId]);


  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setGuidelineText("");
    setDisplayOrder("");

    setEditingGuideline(null);

    setShowForm(false);
  };


  /* =========================================================
     ADD GUIDELINE
     ========================================================= */

  const handleAddGuideline = () => {
    setGuidelineText("");

    setDisplayOrder(
      String(guidelines.length + 1)
    );

    setEditingGuideline(null);

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  };


  /* =========================================================
     EDIT GUIDELINE
     ========================================================= */

  const handleEdit = (
    guideline
  ) => {
    setGuidelineText(
      guideline.guidelineText || ""
    );

    setDisplayOrder(
      guideline.displayOrder?.toString() ||
      ""
    );

    setEditingGuideline(
      guideline
    );

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  };


  /* =========================================================
     SAVE GUIDELINE
     ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!transactionId) {
      setErrorMessage(
        "No transaction selected."
      );

      return;
    }

    if (!guidelineText.trim()) {
      setErrorMessage(
        "Guideline is required."
      );

      return;
    }

    if (
      !displayOrder ||
      Number(displayOrder) < 1
    ) {
      setErrorMessage(
        "Display order must be greater than 0."
      );

      return;
    }

    try {
      setSaving(true);

      if (editingGuideline) {
        await updateGuideline(
          editingGuideline.id,
          transactionId,
          guidelineText,
          displayOrder
        );

        setSuccessMessage(
          "Guideline updated successfully."
        );

      } else {
        await addGuideline(
          transactionId,
          guidelineText,
          displayOrder
        );

        setSuccessMessage(
          "Guideline added successfully."
        );
      }

      resetForm();

      await loadGuidelines();

    } catch (error) {
      console.error(
        "Failed to save guideline:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to save guideline."
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     ACTIVATE / DEACTIVATE
     ========================================================= */

  const handleStatusChange = async (
    guideline
  ) => {
    const newStatus =
      !guideline.isActive;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await setGuidelineActiveStatus(
        guideline.id,
        newStatus
      );

      setSuccessMessage(
        newStatus
          ? "Guideline activated successfully."
          : "Guideline deactivated successfully."
      );

      await loadGuidelines();

    } catch (error) {
      console.error(
        "Failed to update guideline status:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to update guideline status."
      );
    }
  };


  /* =========================================================
     OPEN DELETE MODAL
     ========================================================= */

  const handleDelete = (
    guideline
  ) => {
    console.log(
      "GUIDELINE DELETE CLICKED:",
      guideline
    );

    setGuidelineToDelete(
      guideline
    );

    setErrorMessage("");
    setSuccessMessage("");
  };


  /* =========================================================
     CANCEL DELETE
     ========================================================= */

  const handleCancelDelete = () => {
    if (deletingId) {
      return;
    }

    setGuidelineToDelete(null);
  };


  /* =========================================================
     CONFIRM PERMANENT DELETE
     ========================================================= */

  const handleConfirmDelete = async () => {
    if (!guidelineToDelete) {
      return;
    }

    try {
      setDeletingId(
        guidelineToDelete.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      await deleteGuideline(
        guidelineToDelete.id
      );

      if (
        editingGuideline &&
        editingGuideline.id ===
          guidelineToDelete.id
      ) {
        resetForm();
      }

      setSuccessMessage(
        "Guideline deleted successfully."
      );

      setGuidelineToDelete(null);

      await loadGuidelines();

    } catch (error) {
      console.error(
        "Failed to delete guideline:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to delete guideline."
      );

    } finally {
      setDeletingId(null);
    }
  };


  /* =========================================================
     NO TRANSACTION
     ========================================================= */

  if (!transactionId) {
    return null;
  }


  /* =========================================================
     UI
     ========================================================= */

  return (
    <>

      <section className="transaction-detail-section">

        {/* HEADER */}

        <div className="transaction-detail-section-header">

          <div>

            <h2>
              Guidelines
            </h2>

            <p>
              Manage the guidelines for{" "}

              <strong>
                {transactionName}
              </strong>.
            </p>

          </div>


          {!showForm && (
            <button
              type="button"
              className="transaction-primary-button"
              onClick={handleAddGuideline}
              disabled={
                saving ||
                deletingId !== null
              }
            >
              + Add Guideline
            </button>
          )}

        </div>


        {/* ERROR MESSAGE */}

        {errorMessage && (

          <div className="transaction-error">
            {errorMessage}
          </div>

        )}


        {/* SUCCESS MESSAGE */}

        {successMessage && (

          <div className="transaction-success">
            {successMessage}
          </div>

        )}


        {/* ADD / EDIT FORM */}

        {showForm && (

          <form
            className="embedded-management-form"
            onSubmit={handleSubmit}
          >

            <h3>
              {editingGuideline
                ? "Edit Guideline"
                : "Add Guideline"}
            </h3>


            <div className="transaction-form-grid">

              {/* DISPLAY ORDER */}

              <div className="transaction-form-group">

                <label htmlFor="guidelineDisplayOrder">
                  Display Order
                </label>

                <input
                  id="guidelineDisplayOrder"
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(event) =>
                    setDisplayOrder(
                      event.target.value
                    )
                  }
                  disabled={saving}
                />

              </div>


              {/* GUIDELINE */}

              <div className="transaction-form-group full-width">

                <label htmlFor="guidelineText">
                  Guideline
                </label>

                <textarea
                  id="guidelineText"
                  placeholder="Enter guideline"
                  value={guidelineText}
                  onChange={(event) =>
                    setGuidelineText(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  rows="4"
                />

              </div>

            </div>


            {/* FORM ACTIONS */}

            <div className="transaction-form-actions">

              <button
                type="submit"
                className="transaction-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingGuideline
                    ? "Save Changes"
                    : "Add Guideline"}
              </button>


              <button
                type="button"
                className="transaction-secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

            </div>

          </form>

        )}


        {/* GUIDELINES LIST */}

        {loading ? (

          <p className="transactions-state-message">
            Loading guidelines...
          </p>

        ) : guidelines.length === 0 ? (

          <div className="embedded-empty-state">

            <p>
              No guidelines have been added
              to this transaction yet.
            </p>

          </div>

        ) : (

          <div className="embedded-item-list">

            {guidelines.map(
              (guideline) => (

                <div
                  key={guideline.id}
                  className="embedded-item"
                >

                  {/* CONTENT */}

                  <div className="embedded-item-content">

                    {/* DISPLAY ORDER */}

                    <div className="embedded-item-order">
                      {guideline.displayOrder}
                    </div>


                    {/* GUIDELINE TEXT */}

                    <div>

                      <h4>
                        {guideline.guidelineText}
                      </h4>

                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div className="embedded-item-actions">

                    {/* STATUS */}

                    <span
                      className={
                        guideline.isActive
                          ? "transaction-status active"
                          : "transaction-status inactive"
                      }
                    >
                      {guideline.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>


                    {/* EDIT */}

                    <button
                      type="button"
                      className="transaction-edit-button"
                      onClick={() =>
                        handleEdit(
                          guideline
                        )
                      }
                      disabled={
                        deletingId ===
                        guideline.id
                      }
                    >
                      Edit
                    </button>


                    {/* ACTIVATE / DEACTIVATE */}

                    <button
                      type="button"
                      className="transaction-status-button"
                      onClick={() =>
                        handleStatusChange(
                          guideline
                        )
                      }
                      disabled={
                        deletingId ===
                        guideline.id
                      }
                    >
                      {guideline.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>


                    {/* DELETE */}

                    <button
                      type="button"
                      className="transaction-delete-button"
                      onClick={() =>
                        handleDelete(
                          guideline
                        )
                      }
                      disabled={
                        deletingId ===
                        guideline.id
                      }
                    >
                      {deletingId ===
                      guideline.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </section>


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      <DeleteConfirmationModal
        isOpen={
          guidelineToDelete !== null
        }
        itemType="Guideline"
        itemName={
          guidelineToDelete?.guidelineText ||
          ""
        }
        deleting={
          deletingId !== null
        }
        onCancel={
          handleCancelDelete
        }
        onConfirm={
          handleConfirmDelete
        }
      />

    </>
  );
}


export default GuidelinesSection;