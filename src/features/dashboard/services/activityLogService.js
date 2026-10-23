import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

import {
  db
} from "../../../firebase/firebaseConfig.js";

import {
  convertTimestampToDate
} from "../../../utils/timestampUtils.js";


const ACTIVITY_LOGS_COLLECTION =
  "activity_logs";


/* =========================================================
   ADD ACTIVITY LOG

   Used whenever the admin:
   - adds
   - updates
   - deletes
   - activates
   - deactivates
   a record
   ========================================================= */

export async function addActivityLog({
  type,
  action,
  title,
  description = "",
  parentName = "",
  parentId = "",
  recordId = ""
}) {

  if (!type) {
    throw new Error(
      "Activity type is required."
    );
  }


  if (!action) {
    throw new Error(
      "Activity action is required."
    );
  }


  if (!title) {
    throw new Error(
      "Activity title is required."
    );
  }


  const activityLogsRef =
    collection(
      db,
      ACTIVITY_LOGS_COLLECTION
    );


  await addDoc(
    activityLogsRef,
    {

      /* Example: service, transaction */
      type:
        String(type).trim(),

      /* Example: added, updated, deleted */
      action:
        String(action).trim(),

      /* Exact record that was changed */
      title:
        String(title).trim(),

      /* Additional information */
      description:
        String(description || "").trim(),

      /* Parent record if applicable */
      parentName:
        String(parentName || "").trim(),

      parentId:
        String(parentId || "").trim(),

      /* ID of the changed record */
      recordId:
        String(recordId || "").trim(),

      /* Actual Firestore server time */
      createdAt:
        serverTimestamp()

    }
  );

}


/* =========================================================
   GET RECENT ACTIVITY LOGS

   Dashboard will show ONLY the latest 5.
   ========================================================= */

export async function getRecentActivityLogs() {

  const activityLogsRef =
    collection(
      db,
      ACTIVITY_LOGS_COLLECTION
    );


  const recentActivitiesQuery =
    query(

      activityLogsRef,

      orderBy(
        "createdAt",
        "desc"
      ),

      limit(5)

    );


  const snapshot =
    await getDocs(
      recentActivitiesQuery
    );


  return snapshot.docs.map(
    (document) => ({

      id:
        document.id,

      ...document.data()

    })
  );

}


/* =========================================================
   CONVERT FIRESTORE TIMESTAMP TO JAVASCRIPT DATE
   (Re-exported for backward compatibility)
   ========================================================= */

export { convertTimestampToDate };


/* =========================================================
   FORMAT DATE

   Example:
   October 2, 2026
   ========================================================= */

export function formatActivityDate(
  timestamp
) {

  const date =
    convertTimestampToDate(
      timestamp
    );


  if (!date) {
    return "";
  }


  return date.toLocaleDateString(
    "en-PH",
    {

      year:
        "numeric",

      month:
        "long",

      day:
        "numeric"

    }
  );

}


/* =========================================================
   FORMAT TIME

   Example:
   12:45 AM
   ========================================================= */

export function formatActivityTime(
  timestamp
) {

  const date =
    convertTimestampToDate(
      timestamp
    );


  if (!date) {
    return "";
  }


  return date.toLocaleTimeString(
    "en-PH",
    {

      hour:
        "numeric",

      minute:
        "2-digit",

      hour12:
        true

    }
  );

}


/* =========================================================
   FORMAT DATE + TIME

   Example:
   October 2, 2026 • 12:45 AM
   ========================================================= */

export function formatActivityDateTime(
  timestamp
) {

  const formattedDate =
    formatActivityDate(
      timestamp
    );


  const formattedTime =
    formatActivityTime(
      timestamp
    );


  if (
    !formattedDate &&
    !formattedTime
  ) {

    return "";

  }


  if (!formattedDate) {
    return formattedTime;
  }


  if (!formattedTime) {
    return formattedDate;
  }


  return (
    `${formattedDate} • ${formattedTime}`
  );

}