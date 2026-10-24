import { useEffect, useState } from "react";

import {
  getAllRequirements,
  getActiveTransactions,
  addRequirement,
  updateRequirement,
  setRequirementActiveStatus,
  deleteRequirement
} from "./requirementService";

import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

import "./RequirementsPage.css";


function RequirementsPage() {
  const [requirements, setRequirements] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [requirementToDelete, setRequirementToDelete] =
    useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [transactionId, setTransactionId] = useState("");
  const [requirementText, setRequirementText] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");

  const [editingRequirement, setEditingRequirement] =
    useState(null);


  /* =========================================
     LOAD DATA
     ========================================= */

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [
        requirementData,
        transactionData
      ] = await Promise.all([
        getAllRequirements(),
        getActiveTransactions()
      ]);

      setRequirements(requirementData);
      setTransactions(transactionData);

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
  };


  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [
          requirementData,
          transactionData
        ] = await Promise.all([
          getAllRequirements(),
          getActiveTransactions()
        ]);

        if (!ignore) {
          setRequirements(requirementData);
          setTransactions(transactionData);
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

    fetchInitialData();

    return () => {
      ignore = true;
    };
  }, []);


  /* =========================================
     RESET FORM
     ========================================= */

  const resetForm = () => {
    setTransactionId("");
    setRequirementText("");
    setDisplayOrder("");
    setEditingRequirement(null);
  };


  /* =========================================
     ADD / UPDATE REQUIREMENT
     ========================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!transactionId) {
      setErrorMessage(
        "Please select a transaction."
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

      await loadData();

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


  /* =========================================
     EDIT REQUIREMENT
     ========================================= */

  const handleEdit = (requirement) => {
    setEditingRequirement(requirement);

    setTransactionId(
      requirement.transactionId || ""
    );

    setRequirementText(
      requirement.requirementText || ""
    );

    setDisplayOrder(
      requirement.displayOrder?.toString() || ""
    );

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


  /* =========================================
     CANCEL EDIT
     ========================================= */

  const handleCancelEdit = () => {
    resetForm();

    setErrorMessage("");
    setSuccessMessage("");
  };


  /* =========================================
     ACTIVATE / DEACTIVATE
     ========================================= */

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

      await loadData();

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


  /* =========================================
     OPEN DELETE MODAL
     ========================================= */

  const handleDelete = (
    requirement
  ) => {
    setRequirementToDelete(
      requirement
    );

    setErrorMessage("");
    setSuccessMessage("");
  };


  /* =========================================
     CANCEL DELETE
     ========================================= */

  const handleCancelDelete = () => {
    if (deletingId) {
      return;
    }

    setRequirementToDelete(null);
  };


  /* =========================================
     CONFIRM DELETE
     ========================================= */

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

      await loadData();

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


  /* =========================================
     GET TRANSACTION NAME
     ========================================= */

  const getTransactionName = (
    requirementTransactionId
  ) => {
    const transaction =
      transactions.find(
        (item) =>
          item.id ===
          requirementTransactionId
      );

    return transaction
      ? transaction.name
      : "Unknown Transaction";
  };


  /* =========================================
     UI
     ========================================= */

  return (
    <div className="requirements-page">

      <div className="requirements-container">

        {/* HEADER */}

        <header className="requirements-header">

          <h1>
            Requirements
          </h1>

          <p>
            Add and manage transaction requirements
            available in E-ReQuest.
          </p>

        </header>


        {/* ADD / EDIT FORM */}

        <section className="requirements-card">

          <h2>
            {editingRequirement
              ? "Edit Requirement"
              : "Add Requirement"}
          </h2>


          <form
            className="requirement-form"
            onSubmit={handleSubmit}
          >

            <div className="requirement-form-grid">

              {/* TRANSACTION */}

              <div className="requirement-form-group">

                <label htmlFor="transactionId">
                  Transaction
                </label>

                <select
                  id="transactionId"
                  value={transactionId}
                  onChange={(event) =>
                    setTransactionId(
                      event.target.value
                    )
                  }
                  disabled={saving}
                >

                  <option value="">
                    Select a transaction
                  </option>

                  {transactions.map(
                    (transaction) => (

                      <option
                        key={transaction.id}
                        value={transaction.id}
                      >
                        {transaction.name}
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* REQUIREMENT */}

              <div className="requirement-form-group full-width">

                <label htmlFor="requirementText">
                  Requirement
                </label>

                <textarea
                  id="requirementText"
                  placeholder="Example: School ID"
                  value={requirementText}
                  onChange={(event) =>
                    setRequirementText(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  rows="4"
                />

              </div>


              {/* DISPLAY ORDER */}

              <div className="requirement-form-group">

                <label htmlFor="displayOrder">
                  Display Order
                </label>

                <input
                  id="displayOrder"
                  type="number"
                  min="1"
                  placeholder="Example: 1"
                  value={displayOrder}
                  onChange={(event) =>
                    setDisplayOrder(
                      event.target.value
                    )
                  }
                  disabled={saving}
                />

              </div>

            </div>


            {/* ACTION BUTTONS */}

            <div className="requirement-form-actions">

              <button
                type="submit"
                className="requirement-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingRequirement
                    ? "Save Changes"
                    : "Add Requirement"}
              </button>


              {editingRequirement && (

                <button
                  type="button"
                  className="requirement-secondary-button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

              )}

            </div>

          </form>


          {/* ERROR */}

          {errorMessage && (

            <div className="requirement-error">
              {errorMessage}
            </div>

          )}


          {/* SUCCESS */}

          {successMessage && (

            <div className="requirement-success">
              {successMessage}
            </div>

          )}

        </section>


        {/* EXISTING REQUIREMENTS */}

        <section className="requirements-card">

          <h2>
            Existing Requirements
          </h2>


          {loading ? (

            <p className="requirements-state-message">
              Loading requirements...
            </p>

          ) : requirements.length === 0 ? (

            <p className="requirements-state-message">
              No requirements found.
            </p>

          ) : (

            <div className="requirements-list">

              {requirements.map(
                (requirement) => (

                  <article
                    key={requirement.id}
                    className="requirement-item"
                  >

                    <div className="requirement-item-top">

                      <div className="requirement-information">

                        <h3>
                          {requirement.requirementText}
                        </h3>


                        <div className="requirement-transaction">

                          {getTransactionName(
                            requirement.transactionId
                          )}

                        </div>


                        <p className="requirement-order">

                          <strong>
                            Display Order:
                          </strong>{" "}

                          {requirement.displayOrder}

                        </p>

                      </div>


                      {/* STATUS */}

                      <span
                        className={
                          requirement.isActive
                            ? "requirement-status active"
                            : "requirement-status inactive"
                        }
                      >
                        {requirement.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>

                    </div>


                    {/* ACTIONS */}

                    <div className="requirement-item-actions">

                      {/* EDIT */}

                      <button
                        type="button"
                        className="requirement-edit-button"
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
                        className="requirement-status-button"
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
                        className="requirement-delete-button"
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

                  </article>

                )
              )}

            </div>

          )}

        </section>

      </div>


      {/* =========================================
          DELETE CONFIRMATION MODAL
          ========================================= */}

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

    </div>
  );
}


export default RequirementsPage;