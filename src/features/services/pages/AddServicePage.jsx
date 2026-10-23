import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getServiceById,
  addService,
  updateService
} from "../services/serviceService";

import "../components/AddServicePage.css";


function AddServicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceId } = useParams();
  const isEditMode = Boolean(serviceId);

  const [name, setName] = useState(
    () => location.state?.service?.name || ""
  );
  const [description, setDescription] = useState(
    () => location.state?.service?.description || ""
  );

  const [loading, setLoading] = useState(
    () => isEditMode && !location.state?.service
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     LOAD SERVICE DETAILS WHEN EDITING
     ========================================================= */

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let ignore = false;

    const loadService = async () => {
      try {
        if (!location.state?.service) {
          setLoading(true);
        }
        setErrorMessage("");

        const existing = await getServiceById(serviceId);
        if (ignore) return;

        if (!existing) {
          setErrorMessage("Service not found.");
          return;
        }

        setName(existing.name || "");
        setDescription(existing.description || "");
      } catch (error) {
        console.error("Failed to load service:", error);
        if (!ignore) {
          setErrorMessage("Unable to load service details.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadService();

    return () => {
      ignore = true;
    };
  }, [isEditMode, serviceId, location.state]);

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const handleBack = () => {
    navigate("/services");
  };

  /* =========================================================
     HANDLE SUBMIT (ADD OR UPDATE)
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

      if (isEditMode) {
        await updateService(serviceId, trimmedName, description);

        navigate("/services", {
          replace: true,
          state: {
            successMessage: `Service "${trimmedName}" was updated successfully.`
          }
        });
      } else {
        await addService(trimmedName, description);

        setName("");
        setDescription("");

        navigate("/services", {
          replace: true,
          state: {
            successMessage: `Service "${trimmedName}" was added successfully.`
          }
        });
      }
    } catch (error) {
      console.error("Failed to save service:", error);

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
          disabled={saving}
        >
          <span aria-hidden="true">←</span> Back to Services
        </button>

        {/* HEADER */}
        <header className="add-service-header">
          <h1>{isEditMode ? "Edit Service" : "Add Service"}</h1>
          <p>
            {isEditMode
              ? "Update the department or service category details for E-ReQuest."
              : "Create a new department or service category for E-ReQuest."}
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
                  disabled={saving || loading}
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
                  disabled={saving || loading}
                  rows="4"
                />
              </div>

            </div>

            {/* FORM ACTIONS */}
            <div className="add-service-form-actions">
              <button
                type="submit"
                className="add-service-primary-button"
                disabled={saving || loading}
              >
                {saving
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Add Service"}
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
