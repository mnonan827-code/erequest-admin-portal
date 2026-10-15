import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { addService } from "../services/serviceService";

import "../components/AddServicePage.css";


function AddServicePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const handleBack = () => {
    navigate("/services");
  };

  /* =========================================================
     HANDLE SUBMIT
     ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Service name is required.");
      return;
    }

    try {
      setSaving(true);

      await addService(trimmedName, description);

      /*
       * Clear form and navigate back to Services list
       * with a success message state.
       */
      setName("");
      setDescription("");

      navigate("/services", {
        replace: true,
        state: {
          successMessage: `Service "${trimmedName}" was added successfully.`
        }
      });

    } catch (error) {
      console.error("Failed to add service:", error);

      setErrorMessage(
        error.message || "Unable to save service. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="add-service-page">
      <div className="add-service-container">

        {/* BACK BUTTON */}
        <button
          type="button"
          className="add-service-back-button"
          onClick={handleBack}
        >
          <span aria-hidden="true">←</span> Back to Services
        </button>

        {/* HEADER */}
        <header className="add-service-header">
          <h1>Add Service</h1>
          <p>
            Create a new department or service category for E-ReQuest.
          </p>
        </header>

        {/* FORM CARD */}
        <section className="add-service-card">
          <h2>Service Information</h2>

          <form
            className="add-service-form"
            onSubmit={handleSubmit}
          >
            <div className="add-service-form-grid">

              {/* SERVICE NAME */}
              <div className="add-service-form-group">
                <label htmlFor="serviceName">
                  Service Name <span className="add-service-required">*</span>
                </label>
                <input
                  id="serviceName"
                  type="text"
                  placeholder="Example: Registrar"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* DESCRIPTION */}
              <div className="add-service-form-group full-width">
                <label htmlFor="serviceDescription">
                  Description
                </label>
                <textarea
                  id="serviceDescription"
                  placeholder="Enter service description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={saving}
                  rows="4"
                />
              </div>

            </div>

            {/* FORM ACTIONS */}
            <div className="add-service-form-actions">
              <button
                type="submit"
                className="add-service-primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Add Service"}
              </button>

              <button
                type="button"
                className="add-service-secondary-button"
                onClick={handleBack}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div className="add-service-error">
              {errorMessage}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default AddServicePage;
