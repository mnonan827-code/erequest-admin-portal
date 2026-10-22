import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  getAllAnnouncements,
  addAnnouncement,
  updateAnnouncement
} from "../services/announcementService";

import "../components/AddAnnouncementPage.css";


function AddAnnouncementPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { announcementId } = useParams();
  const isEditMode = Boolean(announcementId);

  const [title, setTitle] = useState(
    () => location.state?.announcement?.title || ""
  );
  const [message, setMessage] = useState(
    () => location.state?.announcement?.message || ""
  );
  const [displayOrder, setDisplayOrder] = useState(
    () =>
      location.state?.announcement?.displayOrder != null
        ? String(location.state.announcement.displayOrder)
        : ""
  );

  const [loading, setLoading] = useState(
    () => !isEditMode || !location.state?.announcement
  );
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* =========================================================
     LOAD INITIAL DISPLAY ORDER OR ANNOUNCEMENT DETAILS
     ========================================================= */

  useEffect(() => {
    let ignore = false;

    const loadAnnouncementData = async () => {
      try {
        if (!isEditMode || !location.state?.announcement) {
          setLoading(true);
        }
        setErrorMessage("");

        const data = await getAllAnnouncements();
        if (ignore) return;

        if (isEditMode) {
          const existing = data.find((item) => item.id === announcementId);
          if (!existing) {
            setErrorMessage("Announcement not found.");
            return;
          }

          setTitle(existing.title || "");
          setMessage(existing.message || "");
          setDisplayOrder(
            existing.displayOrder != null ? String(existing.displayOrder) : "1"
          );
        } else {
          const maxOrder = data.reduce(
            (max, item) => Math.max(max, Number(item.displayOrder) || 0),
            0
          );
          setDisplayOrder(String(maxOrder + 1));
        }
      } catch (error) {
        console.error("Failed to load announcement data:", error);
        if (!ignore) {
          if (isEditMode) {
            setErrorMessage("Unable to load announcement details.");
          } else {
            setDisplayOrder("1");
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadAnnouncementData();

    return () => {
      ignore = true;
    };
  }, [isEditMode, announcementId, location.state]);

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const handleBack = () => {
    navigate("/announcements");
  };

  /* =========================================================
     SUBMIT (ADD OR UPDATE)
     ========================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const orderNum = Number(displayOrder);

    if (!cleanTitle) {
      setErrorMessage("Announcement title is required.");
      return;
    }

    if (!cleanMessage) {
      setErrorMessage("Announcement message is required.");
      return;
    }

    if (!displayOrder || Number.isNaN(orderNum) || orderNum < 1) {
      setErrorMessage("Display order must be greater than 0.");
      return;
    }

    try {
      setSaving(true);

      if (isEditMode) {
        await updateAnnouncement(
          announcementId,
          cleanTitle,
          cleanMessage,
          orderNum
        );

        navigate("/announcements", {
          replace: true,
          state: {
            successMessage: `Announcement "${cleanTitle}" was updated successfully.`
          }
        });
      } else {
        await addAnnouncement(cleanTitle, cleanMessage, orderNum);

        setTitle("");
        setMessage("");
        setDisplayOrder("");

        navigate("/announcements", {
          replace: true,
          state: {
            successMessage: `Announcement "${cleanTitle}" was added successfully.`
          }
        });
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
      setErrorMessage(
        error.message || "Unable to save announcement. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="add-announcement-page">
      <div className="add-announcement-container">

        {/* BACK BUTTON */}
        <button
          type="button"
          className="add-announcement-back-button"
          onClick={handleBack}
          disabled={saving}
        >
          <span aria-hidden="true">←</span> Back to Announcements
        </button>

        {/* HEADER */}
        <header className="add-announcement-header">
          <h1>{isEditMode ? "Edit Announcement" : "Add Announcement"}</h1>
          <p>
            {isEditMode
              ? "Update the announcement details shown to students in the E-ReQuest application."
              : "Create an announcement to display to students in the E-ReQuest application."}
          </p>
        </header>

        {/* FORM CARD */}
        <section className="add-announcement-card">
          <h2>Announcement Details</h2>

          <form onSubmit={handleSubmit}>
            <div className="add-announcement-form-grid">

              {/* DISPLAY ORDER */}
              <div className="add-announcement-form-group">
                <label htmlFor="displayOrder">
                  Display Order <span className="add-announcement-required">*</span>
                </label>
                <input
                  id="displayOrder"
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(event) => setDisplayOrder(event.target.value)}
                  disabled={saving || loading}
                  required
                />
              </div>

              {/* TITLE */}
              <div className="add-announcement-form-group full-width">
                <label htmlFor="announcementTitle">
                  Title <span className="add-announcement-required">*</span>
                </label>
                <input
                  id="announcementTitle"
                  type="text"
                  placeholder="Example: Registrar Office Maintenance"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={saving || loading}
                  required
                  autoFocus
                />
              </div>

              {/* MESSAGE */}
              <div className="add-announcement-form-group full-width">
                <label htmlFor="announcementMessage">
                  Message <span className="add-announcement-required">*</span>
                </label>
                <textarea
                  id="announcementMessage"
                  placeholder="Enter announcement message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={saving || loading}
                  rows="6"
                  required
                />
              </div>

            </div>

            {/* FORM ACTIONS */}
            <div className="add-announcement-form-actions">
              <button
                type="submit"
                className="add-announcement-primary-button"
                disabled={saving || loading}
              >
                {saving
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Add Announcement"}
              </button>

              <button
                type="button"
                className="add-announcement-secondary-button"
                onClick={handleBack}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>

          {/* ERROR MESSAGE */}
          {errorMessage && (
            <div className="add-announcement-error">
              {errorMessage}
            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default AddAnnouncementPage;
