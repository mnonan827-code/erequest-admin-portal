import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getAllServices,
  addService,
  updateService,
  setServiceActiveStatus,
  deleteService,
  getServiceTransactionCount
} from "../services/serviceService";

import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";

import "../components/ServicesPage.css";


function ServicesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    () => location.state?.successMessage || ""
  );

  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingService, setEditingService] = useState(null);

  /* DELETE MODAL */
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedDetails, setBlockedDetails] = useState([]);

  /* CLEAR NAVIGATION STATE */
  useEffect(() => {
    if (location.state?.successMessage) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  /* FILTERED SERVICES BY SEARCH */
  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) {
      return services;
    }
    const clean = searchQuery.toLowerCase().trim();
    return services.filter((service) => {
      const matchName = (service.name || "").toLowerCase().includes(clean);
      const matchDesc = (service.description || "").toLowerCase().includes(clean);
      return matchName || matchDesc;
    });
  }, [services, searchQuery]);


  /* =========================================================
     LOAD SERVICES
     ========================================================= */

  const loadServices = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getAllServices();

      setServices(data);

    } catch (error) {
      console.error(
        "Failed to load services:",
        error
      );

      setErrorMessage(
        "Unable to load services. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const data = await getAllServices();

        if (!ignore) {
          setServices(data);
        }

      } catch (error) {
        console.error(
          "Failed to load services:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load services. Please try again."
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


  /* =========================================================
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingService(null);
  };


  /* =========================================================
     ADD / UPDATE SERVICE
     ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage(
        "Service name is required."
      );

      return;
    }

    try {
      setSaving(true);

      /* UPDATE EXISTING SERVICE */

      if (editingService) {
        await updateService(
          editingService.id,
          name,
          description
        );

        setSuccessMessage(
          "Service updated successfully."
        );

      } else {

        /* ADD NEW SERVICE */

        await addService(
          name,
          description
        );

        setSuccessMessage(
          "Service added successfully."
        );
      }

      resetForm();

      await loadServices();

    } catch (error) {
      console.error(
        "Failed to save service:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to save service."
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     EDIT SERVICE
     ========================================================= */

  const handleEdit = (service) => {
    setEditingService(service);

    setName(
      service.name || ""
    );

    setDescription(
      service.description || ""
    );

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


  /* =========================================================
     CANCEL EDIT
     ========================================================= */

  const handleCancelEdit = () => {
    resetForm();

    setErrorMessage("");
    setSuccessMessage("");
  };


  /* =========================================================
     ACTIVATE / DEACTIVATE
     ========================================================= */

  const handleStatusChange = async (service) => {
    const newStatus = !service.isActive;

    try {
      setErrorMessage("");
      setSuccessMessage("");

      await setServiceActiveStatus(
        service.id,
        newStatus
      );

      setSuccessMessage(
        newStatus
          ? "Service activated successfully."
          : "Service deactivated successfully."
      );

      await loadServices();

    } catch (error) {
      console.error(
        "Failed to update service status:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to update service status."
      );
    }
  };


  /* =========================================================
     OPEN DELETE CONFIRMATION
     ========================================================= */

  const handleDelete = async (service) => {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setDeleting(true);

      const transactionCount =
        await getServiceTransactionCount(service.id);

      if (transactionCount > 0) {
        setIsBlocked(true);
        setBlockedDetails([
          `${transactionCount} Transaction(s) belong to this service.`
        ]);
      } else {
        setIsBlocked(false);
        setBlockedDetails([]);
      }

      setServiceToDelete(service);
    } catch (error) {
      console.error(
        "Failed to verify service transactions:",
        error
      );

      setIsBlocked(false);
      setBlockedDetails([]);
      setServiceToDelete(service);
    } finally {
      setDeleting(false);
    }
  };


  /* =========================================================
     CANCEL DELETE
     ========================================================= */

  const handleCancelDelete = () => {
    if (deleting) {
      return;
    }

    setServiceToDelete(null);
    setIsBlocked(false);
    setBlockedDetails([]);
  };


  /* =========================================================
     CONFIRM PERMANENT DELETE
     ========================================================= */

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) {
      return;
    }

    try {
      setDeleting(true);

      setErrorMessage("");
      setSuccessMessage("");

      await deleteService(
        serviceToDelete.id
      );

      /*
       * If the deleted service is currently
       * being edited, clear the edit form.
       */

      if (
        editingService &&
        editingService.id === serviceToDelete.id
      ) {
        resetForm();
      }

      setSuccessMessage(
        "Service deleted successfully."
      );

      setServiceToDelete(null);

      await loadServices();

    } catch (error) {
      console.error(
        "Failed to delete service:",
        error
      );

      setErrorMessage(
        error.message ||
        "Unable to delete service."
      );

    } finally {
      setDeleting(false);
    }
  };


  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="services-page">

      <div className="services-container">

        {/* ===================================================
            BACK TO DASHBOARD
            =================================================== */}

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


        {/* ===================================================
            HEADER
            =================================================== */}

        <header className="services-header">

          <div className="services-header-content">

            <div>
              <h1>
                Services
              </h1>

              <p>
                Add and update the services available in E-ReQuest.
              </p>
            </div>


            <div className="services-header-actions">

              {/* CONTEXTUAL SEARCH BAR */}
              <div className="services-search-bar">

                <span
                  className="services-search-icon"
                  aria-hidden="true"
                >
                  🔍
                </span>

                <input
                  type="text"
                  className="services-search-input"
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  aria-label="Search services"
                />

                {searchQuery && (
                  <button
                    type="button"
                    className="services-search-clear"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}

              </div>


              {/* ADD SERVICE BUTTON */}
              <button
                type="button"
                className="service-primary-button"
                onClick={() => navigate("/services/add")}
              >
                + Add Service
              </button>

            </div>

          </div>

        </header>


        {/* MESSAGES */}

        {errorMessage && (
          <div className="service-error" style={{ marginBottom: "20px" }}>
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="service-success" style={{ marginBottom: "20px" }}>
            {successMessage}
          </div>
        )}


        {/* ===================================================
            EDIT SERVICE (ONLY WHEN EDITING)
            =================================================== */}

        {editingService && (
          <section className="services-card">

            <h2>
              Edit Service
            </h2>


            <form
              className="service-form"
              onSubmit={handleSubmit}
            >

              <div className="service-form-grid">

                {/* SERVICE NAME */}

                <div className="service-form-group">

                  <label htmlFor="serviceName">
                    Service Name
                  </label>

                  <input
                    id="serviceName"
                    type="text"
                    placeholder="Example: Registrar"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    disabled={saving}
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="service-form-group full-width">

                  <label htmlFor="serviceDescription">
                    Description
                  </label>

                  <textarea
                    id="serviceDescription"
                    placeholder="Enter service description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    rows="4"
                  />

                </div>

              </div>


              {/* FORM BUTTONS */}

              <div className="service-form-actions">

                <button
                  type="submit"
                  className="service-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>


                <button
                  type="button"
                  className="service-secondary-button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>

              </div>

            </form>

          </section>
        )}


        {/* ===================================================
            EXISTING SERVICES
            =================================================== */}

        <section className="services-card">

          <h2>
            Existing Services
          </h2>


          {loading ? (

            <p className="services-state-message">
              Loading services...
            </p>

          ) : filteredServices.length === 0 ? (

            <p className="services-state-message">
              {searchQuery
                ? `No services found matching "${searchQuery}".`
                : "No services found."}
            </p>

          ) : (

            <div className="services-list">

              {filteredServices.map((service) => (

                <article
                  key={service.id}
                  className="service-item"
                >

                  {/* SERVICE INFORMATION */}

                  <div className="service-item-top">

                    <div>

                      <h3>
                        {service.name}
                      </h3>

                      <p className="service-description">
                        {service.description ||
                          "No description"}
                      </p>

                    </div>


                    {/* STATUS */}

                    <span
                      className={
                        service.isActive
                          ? "service-status active"
                          : "service-status inactive"
                      }
                    >
                      {service.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>

                  </div>


                  {/* ACTION BUTTONS */}

                  <div className="service-item-actions">

                    {/* EDIT */}

                    <button
                      type="button"
                      className="service-edit-button"
                      onClick={() =>
                        handleEdit(service)
                      }
                    >
                      Edit
                    </button>


                    {/* ACTIVATE / DEACTIVATE */}

                    <button
                      type="button"
                      className="service-status-button"
                      onClick={() =>
                        handleStatusChange(
                          service
                        )
                      }
                    >
                      {service.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>


                    {/* DELETE */}

                    <button
                      type="button"
                      className="service-delete-button"
                      onClick={() =>
                        handleDelete(service)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </article>

              ))}

            </div>

          )}

        </section>

      </div>


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      <DeleteConfirmationModal
        isOpen={serviceToDelete !== null}
        itemType="Service"
        itemName={serviceToDelete?.name || ""}
        deleting={deleting}
        isBlocked={isBlocked}
        blockedDetails={blockedDetails}
        recommendation="Please delete or reassign those Transactions first, or use Deactivate instead."
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

    </div>
  );
}


export default ServicesPage;