import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getAllAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  setAnnouncementActiveStatus,
  deleteAnnouncement
} from "../services/announcementService";

import DeleteConfirmationModal from "../../../components/DeleteConfirmationModal";

import "../components/AnnouncementsPage.css";


function AnnouncementsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [announcementToDelete, setAnnouncementToDelete] =
    useState(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    () => location.state?.successMessage || ""
  );

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");

  const [editingAnnouncement, setEditingAnnouncement] =
    useState(null);

  /* CLEAR NAVIGATION STATE */
  useEffect(() => {
    if (location.state?.successMessage) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);


  /* =========================================================
     LOAD ANNOUNCEMENTS
     ========================================================= */

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const data =
        await getAllAnnouncements();

      const sortedData =
        [...data].sort(
          (a, b) =>
            (a.displayOrder || 0) -
            (b.displayOrder || 0)
        );

      setAnnouncements(sortedData);

    } catch (error) {
      console.error(
        "Failed to load announcements:",
        error
      );

      setErrorMessage(
        "Unable to load announcements."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const data =
          await getAllAnnouncements();

        const sortedData =
          [...data].sort(
            (a, b) =>
              (a.displayOrder || 0) -
              (b.displayOrder || 0)
          );

        if (!ignore) {
          setAnnouncements(sortedData);
        }

      } catch (error) {
        console.error(
          "Failed to load announcements:",
          error
        );

        if (!ignore) {
          setErrorMessage(
            "Unable to load announcements."
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
     RESET FORM
     ========================================================= */

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setDisplayOrder("");

    setEditingAnnouncement(null);
  };


  /* =========================================================
     ADD
     ========================================================= */

  const handleAdd = () => {
    navigate("/announcements/add");
  };


  /* =========================================================
     EDIT
     ========================================================= */

  const handleEdit = (
    announcement
  ) => {
    setTitle(
      announcement.title || ""
    );

    setMessage(
      announcement.message || ""
    );

    setDisplayOrder(
      announcement.displayOrder?.toString() ||
        ""
    );

    setEditingAnnouncement(
      announcement
    );

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


  /* =========================================================
     SAVE
     ========================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (!title.trim()) {
      setErrorMessage(
        "Announcement title is required."
      );

      return;
    }

    if (!message.trim()) {
      setErrorMessage(
        "Announcement message is required."
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

      if (editingAnnouncement) {
        await updateAnnouncement(
          editingAnnouncement.id,
          title,
          message,
          displayOrder
        );

        setSuccessMessage(
          "Announcement updated successfully."
        );

      } else {
        await addAnnouncement(
          title,
          message,
          displayOrder
        );

        setSuccessMessage(
          "Announcement added successfully."
        );
      }

      setTitle("");
      setMessage("");
      setDisplayOrder("");

      setEditingAnnouncement(null);

      await loadAnnouncements();

    } catch (error) {
      console.error(
        "Failed to save announcement:",
        error
      );

      setErrorMessage(
        error.message ||
          "Unable to save announcement."
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     ACTIVATE / DEACTIVATE
     ========================================================= */

  const handleStatusChange = async (
    announcement
  ) => {
    const newStatus =
      !announcement.isActive;

    try {
      setSaving(true);

      setErrorMessage("");
      setSuccessMessage("");

      await setAnnouncementActiveStatus(
        announcement.id,
        newStatus
      );

      setSuccessMessage(
        newStatus
          ? "Announcement activated successfully."
          : "Announcement deactivated successfully."
      );

      await loadAnnouncements();

    } catch (error) {
      console.error(
        "Failed to update announcement status:",
        error
      );

      setErrorMessage(
        "Unable to update announcement status."
      );

    } finally {
      setSaving(false);
    }
  };


  /* =========================================================
     OPEN DELETE MODAL
     ========================================================= */

  const handleDelete = (
    announcement
  ) => {
    console.log(
      "ANNOUNCEMENT DELETE CLICKED:",
      announcement
    );

    setAnnouncementToDelete(
      announcement
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

    setAnnouncementToDelete(null);
  };


  /* =========================================================
     CONFIRM PERMANENT DELETE
     ========================================================= */

  const handleConfirmDelete =
    async () => {
      if (!announcementToDelete) {
        return;
      }

      try {
        setDeletingId(
          announcementToDelete.id
        );

        setErrorMessage("");
        setSuccessMessage("");

        await deleteAnnouncement(
          announcementToDelete.id
        );

        if (
          editingAnnouncement?.id ===
          announcementToDelete.id
        ) {
          resetForm();
        }

        setSuccessMessage(
          "Announcement deleted successfully."
        );

        setAnnouncementToDelete(null);

        await loadAnnouncements();

      } catch (error) {
        console.error(
          "Failed to delete announcement:",
          error
        );

        setErrorMessage(
          error.message ||
            "Unable to delete announcement."
        );

      } finally {
        setDeletingId(null);
      }
    };


  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <>
      <div className="announcements-page">

        <div className="announcements-container">

          {/* BACK BUTTON */}

          <button
            type="button"
            className="announcements-back-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ← Back to Dashboard
          </button>


          {/* HEADER */}

          <header className="announcements-header">

            <div>
              <h1>
                Announcements
              </h1>

              <p>
                Manage important announcements shown
                to students in the E-ReQuest application.
              </p>
            </div>


            <button
              type="button"
              className="announcement-primary-button"
              onClick={handleAdd}
              disabled={
                saving ||
                deletingId !== null
              }
            >
              + Add Announcement
            </button>

          </header>


          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="announcement-error">
              {errorMessage}
            </div>
          )}


          {/* SUCCESS MESSAGE */}

          {successMessage && (
            <div className="announcement-success">
              {successMessage}
            </div>
          )}


          {/* EDIT FORM (ONLY WHEN EDITING) */}

          {editingAnnouncement && (
            <section className="announcement-card">

              <h2>
                Edit Announcement
              </h2>


              <form onSubmit={handleSubmit}>

                <div className="announcement-form-grid">

                  {/* DISPLAY ORDER */}

                  <div className="announcement-form-group">

                    <label htmlFor="displayOrder">
                      Display Order
                    </label>

                    <input
                      id="displayOrder"
                      type="number"
                      min="1"
                      value={displayOrder}
                      onChange={(event) =>
                        setDisplayOrder(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      required
                    />

                  </div>


                  {/* TITLE */}

                  <div className="announcement-form-group full-width">

                    <label htmlFor="announcementTitle">
                      Title
                    </label>

                    <input
                      id="announcementTitle"
                      type="text"
                      placeholder="Example: Registrar Office Closed"
                      value={title}
                      onChange={(event) =>
                        setTitle(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      required
                    />

                  </div>


                  {/* MESSAGE */}

                  <div className="announcement-form-group full-width">

                    <label htmlFor="announcementMessage">
                      Message
                    </label>

                    <textarea
                      id="announcementMessage"
                      placeholder="Enter announcement message"
                      value={message}
                      onChange={(event) =>
                        setMessage(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      rows="5"
                      required
                    />

                  </div>

                </div>


                {/* FORM BUTTONS */}

                <div className="announcement-form-actions">

                  <button
                    type="submit"
                    className="announcement-primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>


                  <button
                    type="button"
                    className="announcement-secondary-button"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                </div>

              </form>

            </section>
          )}


          {/* ANNOUNCEMENTS LIST */}

          <section className="announcement-card">

            <div className="announcement-list-heading">

              <div>
                <h2>
                  Available Announcements
                </h2>

                <p>
                  Announcements currently stored
                  in the system.
                </p>
              </div>

            </div>


            {loading ? (

              <div className="announcement-state-message">
                Loading announcements...
              </div>

            ) : announcements.length === 0 ? (

              <div className="announcement-state-message">
                No announcements have been added yet.
              </div>

            ) : (

              <div className="announcement-list">

                {announcements.map(
                  (announcement) => (

                    <div
                      key={announcement.id}
                      className="announcement-item"
                    >

                      {/* CONTENT */}

                      <div className="announcement-item-content">

                        <div className="announcement-order">
                          {announcement.displayOrder}
                        </div>


                        <div className="announcement-information">

                          <h3>
                            {announcement.title}
                          </h3>

                          <p className="announcement-message">
                            {announcement.message}
                          </p>

                        </div>

                      </div>


                      {/* ACTIONS */}

                      <div className="announcement-actions">

                        {/* STATUS */}

                        <span
                          className={
                            announcement.isActive
                              ? "announcement-status active"
                              : "announcement-status inactive"
                          }
                        >
                          {announcement.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>


                        {/* EDIT */}

                        <button
                          type="button"
                          className="announcement-edit-button"
                          onClick={() =>
                            handleEdit(
                              announcement
                            )
                          }
                          disabled={
                            saving ||
                            deletingId !== null
                          }
                        >
                          Edit
                        </button>


                        {/* ACTIVATE / DEACTIVATE */}

                        <button
                          type="button"
                          className="announcement-status-button"
                          onClick={() =>
                            handleStatusChange(
                              announcement
                            )
                          }
                          disabled={
                            saving ||
                            deletingId !== null
                          }
                        >
                          {announcement.isActive
                            ? "Deactivate"
                            : "Activate"}
                        </button>


                        {/* DELETE */}

                        <button
                          type="button"
                          className="announcement-delete-button"
                          onClick={() =>
                            handleDelete(
                              announcement
                            )
                          }
                          disabled={
                            saving ||
                            deletingId !== null
                          }
                          style={{
                            backgroundColor: "#dc3545",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "8px 14px",
                            cursor:
                              saving ||
                              deletingId !== null
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "600"
                          }}
                        >
                          {deletingId ===
                          announcement.id
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

        </div>

      </div>


      {/* =====================================================
          DELETE CONFIRMATION MODAL
          ===================================================== */}

      <DeleteConfirmationModal
        isOpen={
          announcementToDelete !== null
        }
        itemType="Announcement"
        itemName={
          announcementToDelete?.title ||
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


export default AnnouncementsPage;