import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  getAllAnnouncements,
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
     ADD
     ========================================================= */

  const handleAdd = () => {
    navigate("/announcements/add");
  };


  /* =========================================================
     EDIT (NAVIGATES TO DEDICATED EDIT PAGE)
     ========================================================= */

  const handleEdit = (announcement) => {
    navigate(`/announcements/edit/${announcement.id}`, {
      state: { announcement }
    });
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
