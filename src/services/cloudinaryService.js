const CLOUD_NAME =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
  "hu9xgqne";

const UPLOAD_PRESET =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
  "erequest_procedure_images";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function uploadProcedureImage(file) {
  if (!file) {
    return "";
  }

  // Images only
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file only.");
  }

  // Maximum 5 MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must not exceed 5 MB.");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "Failed to upload image to Cloudinary."
    );
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url;
}