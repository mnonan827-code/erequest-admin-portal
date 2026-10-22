import { useEffect, useState, useCallback } from "react";

import {
  getRequirementsByTransactionId,
  addRequirement,
  updateRequirement,
  setRequirementActiveStatus,
  deleteRequirement
} from "../services/requirementService";

import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";


function RequirementsSection({
  transactionId,
  transactionName
}) {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [requirementToDelete, setRequirementToDelete] =
    useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [requirementText, setRequirementText] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");

  const [editingRequirement, setEditingRequirement] =
    useState(null);


  /* =========================================================
     LOAD REQUIREMENTS
     ========================================================= */

  const loadRequirements = useCallback(async () => {
    if (!transactionId) {
      setRequirements([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const filteredRequirements =
        await getRequirementsByTransactionId(transactionId);

      setRequirements(
        filteredRequirements
      );

    } catch (error) {
      console.error(
        "Failed to load requirements:",
        error
      );

      setErrorMessage(
        "Unable to load requirements."
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

    const fetchRequirements = async () => {
      try {
        const filteredRequirements =
          await getRequirementsByTransactionId(transactionId);

        if (!ignore) {
          setRequirements(
            filteredRequirements
          );
        }

      } catch (error) {
        console.error(
          "Failed to load requirements:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load requirements."
          );
        }

      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchRequirements();

    return () => {
      ignore = true;
    };
  }, [transactionId]);


  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setRequirementText("");
    setDisplayOrder("");
    setEditingRequirement(null);
    setShowForm(false);
  };


  /* =========================================================
     ADD REQUIREMENT
     ========================================================= */

  const handleAddRequirement = () => {
    setRequirementText("");

    setDisplayOrder(
      String(requirements.length + 1)
    );

    setEditingRequirement(null);

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  };


  /* =========================================================
     EDIT REQUIREMENT
     ========================================================= */

  const handleEdit = (requirement) => {
    setRequirementText(
      requirement.requirementText || ""
    );

    setDisplayOrder(
      requirement.displayOrder?.toString() ||
      ""
    );

    setEditingRequirement(
      requirement
    );

    setErrorMessage("");
    setSuccessMessage("");

    setShowForm(true);
  };


  /* =========================================================
     SAVE REQUIREMENT
     ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!transactionId) {
      setErrorMessage(
        "No transaction selected."
      );

      return;
    }

    if (!requirementText.trim()) {
      setErrorMessage(
        "Requirement is required."
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

      if (editingRequirement) {
        await updateRequirement(
          editingRequirement.id,
          transactionId,
          requirementText,
          displayOrder
        );

        setSuccessMessage(
          "Requirement updated successfully."
        );

      } else {
        await addRequirement(
          transactionId,
          requirementText,
          displayOrder
        );

        setSuccessMessage(
          "Requirement added successfully."
        );
      }

      resetForm();

      await loadRequirements();

    } catch (error) {
      console.error(
        "Failed to save requirement:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to save requirement."
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     ACTIVATE / DEACTIVATE
     ========================================================= */

  const handleStatusChange = async (
    requirement
  ) => {
    const newStatus =
      !requirement.isActive;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await setRequirementActiveStatus(
        requirement.id,
        newStatus
      );

      setSuccessMessage(
        newStatus
          ? "Requirement activated successfully."
          : "Requirement deactivated successfully."
      );

      await loadRequirements();

    } catch (error) {
      console.error(
        "Failed to update requirement status:",
        error
      );

      setErrorMessage(
        "Unable to update requirement status."
      );
    }
  };


  /* =========================================================
     OPEN DELETE MODAL
     ========================================================= */

  const handleDelete = (
    requirement
  ) => {
    setRequirementToDelete(
      requirement
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

    setRequirementToDelete(null);
  };


  /* =========================================================
     CONFIRM PERMANENT DELETE
     ========================================================= */

  const handleConfirmDelete = async () => {
    if (!requirementToDelete) {
      return;
    }

    try {
      setDeletingId(
        requirementToDelete.id
      );

      setErrorMessage("");
      setSuccessMessage("");

      await deleteRequirement(
        requirementToDelete.id
      );

      if (
        editingRequirement &&
        editingRequirement.id ===
          requirementToDelete.id
      ) {
        resetForm();
      }

      setSuccessMessage(
        "Requirement deleted successfully."
      );

      setRequirementToDelete(null);

      await loadRequirements();

    } catch (error) {
      console.error(
        "Failed to delete requirement:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to delete requirement."
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
              Requirements
            </h2>

            <p>
              Requirements needed for{" "}
              <strong>
                {transactionName}
              </strong>.
            </p>
          </div>


          {!showForm && (
            <button
              type="button"
              className="transaction-primary-button"
              onClick={handleAddRequirement}
              disabled={
                saving ||
                deletingId !== null
              }
            >
              + Add Requirement
            </button>
          )}

        </div>


        {/* MESSAGES */}

        {errorMessage && (
          <div className="transaction-error">
            {errorMessage}
          </div>
        )}


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
              {editingRequirement
                ? "Edit Requirement"
                : "Add Requirement"}
            </h3>


            <div className="transaction-form-grid">

              {/* DISPLAY ORDER */}

              <div className="transaction-form-group">

                <label htmlFor="embeddedDisplayOrder">
                  Display Order
                </label>

                <input
                  id="embeddedDisplayOrder"
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


              {/* REQUIREMENT */}

              <div className="transaction-form-group full-width">

                <label htmlFor="embeddedRequirementText">
                  Requirement
                </label>

                <textarea
                  id="embeddedRequirementText"
                  placeholder="Enter requirement"
                  value={requirementText}
                  onChange={(event) =>
                    setRequirementText(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  rows="3"
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
                  : editingRequirement
                    ? "Save Changes"
                    : "Add Requirement"}
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


        {/* REQUIREMENTS LIST */}

        {loading ? (

          <p className="transactions-state-message">
            Loading requirements...
          </p>

        ) : requirements.length === 0 ? (

          <div className="embedded-empty-state">
            <p>
              No requirements have been added
              to this transaction yet.
            </p>
          </div>

        ) : (

          <div className="embedded-item-list">

            {requirements.map(
              (requirement) => (

                <div
                  key={requirement.id}
                  className="embedded-item"
                >

                  {/* REQUIREMENT INFORMATION */}

                  <div className="embedded-item-content">

                    <div className="embedded-item-order">
                      {requirement.displayOrder}
                    </div>

                    <div>
                      <h4>
                        {requirement.requirementText}
                      </h4>
                    </div>

                  </div>


                  {/* ACTIONS */}

                  <div className="embedded-item-actions">

                    {/* STATUS */}

                    <span
                      className={
                        requirement.isActive
                          ? "transaction-status active"
                          : "transaction-status inactive"
                      }
                    >
                      {requirement.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>


                    {/* EDIT */}

                    <button
                      type="button"
                      className="transaction-edit-button"
                      onClick={() =>
                        handleEdit(
                          requirement
                        )
                      }
                      disabled={
                        deletingId ===
                        requirement.id
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
                          requirement
                        )
                      }
                      disabled={
                        deletingId ===
                        requirement.id
                      }
                    >
                      {requirement.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>


                    {/* DELETE */}

                    <button
                      type="button"
                      className="transaction-delete-button"
                      onClick={() =>
                        handleDelete(
                          requirement
                        )
                      }
                      disabled={
                        deletingId ===
                        requirement.id
                      }
                    >
                      {deletingId ===
                      requirement.id
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
          requirementToDelete !== null
        }
        itemType="Requirement"
        itemName={
          requirementToDelete?.requirementText ||
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


export default RequirementsSection;