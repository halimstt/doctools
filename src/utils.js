// src/utils.js

/**
 * Global function to get Gemini API key from localStorage.
 * @returns {string} The Gemini API key or an empty string if not found.
 */
export function getGeminiApiKey() {
  return localStorage.getItem("geminiApiKey") || "";
}

/**
 * Global function to set Gemini API key in localStorage.
 * @param {string} key - The API key to save.
 */
export function setGeminiApiKey(key) {
  localStorage.setItem("geminiApiKey", key);
}

/**
 * Displays the API key modal and returns a promise that resolves with the entered key or null.
 * It expects the following DOM elements to be present:
 * - <dialog id="shared-api-key-modal">
 * - #shared-api-key-input
 * - #shared-api-key-save-btn
 * - #shared-api-key-cancel-btn
 * @returns {Promise<string|null>} A promise that resolves with the Gemini API key or null if canceled.
 */
export function showApiKeyModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("shared-api-key-modal");
    const input = document.getElementById("shared-api-key-input");
    const saveBtn = document.getElementById("shared-api-key-save-btn");
    const cancelBtn = document.getElementById("shared-api-key-cancel-btn");

    if (!modal || !input || !saveBtn || !cancelBtn) {
      console.error("Missing required DOM elements for API Key Modal.");
      resolve(null);
      return;
    }

    input.value = getGeminiApiKey(); // Pre-fill with existing key
    modal.showModal(); // Show modal using DaisyUI's method

    const handleSave = () => {
      const key = input.value.trim();
      if (key) {
        setGeminiApiKey(key);
        modal.close(); // Close modal using DaisyUI's method
        saveBtn.removeEventListener("click", handleSave);
        cancelBtn.removeEventListener("click", handleCancel);
        resolve(key);
      } else {
        // Use showMessage for feedback if input is empty
        showMessage("warning", "Please enter a valid Gemini API key.");
      }
    };

    const handleCancel = () => {
      modal.close(); // Close modal using DaisyUI's method
      saveBtn.removeEventListener("click", handleSave);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(null);
    };

    saveBtn.addEventListener("click", handleSave);
    cancelBtn.addEventListener("click", handleCancel);

    // Handle closing via backdrop click (ESC key is handled by default for <dialog>)
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        // Only close if clicked on the backdrop
        handleCancel();
      }
    });
  });
}

/**
 * Displays a message as a DaisyUI toast notification.
 * @param {'error'|'success'|'warning'|'info'} type - The type of message (determines styling).
 * @param {string} message - The message content.
 * @param {number} [duration=null] - Optional. Duration in milliseconds before the toast auto-hides.
 * If null, duration is calculated based on message length.
 */
export function showMessage(type, message, duration = null) {
  const toastContainer = document.getElementById("toast-container");

  if (!toastContainer) {
    console.error(
      "Missing required DOM element for Toast Container. Message:",
      message
    );
    return;
  }

  // Calculate duration based on message length if not explicitly provided
  let calculatedDuration = duration;
  if (calculatedDuration === null) {
    const minDuration = 5000; // Minimum display time for any toast (5 seconds)
    const wordsPerSecond = 2; // Average reading speed for short messages
    const words = message.split(/\s+/).filter((word) => word.length > 0).length; // Count words
    calculatedDuration = Math.max(minDuration, (words / wordsPerSecond) * 1000);
  }

  // Create toast structure
  const toastWrapper = document.createElement("div");
  toastWrapper.className = "alert cursor-pointer"; // Added cursor-pointer class for visual feedback

  // Add specific alert type class
  if (type === "error") {
    toastWrapper.classList.add("alert-error");
  } else if (type === "success") {
    toastWrapper.classList.add("alert-success");
  } else if (type === "warning") {
    toastWrapper.classList.add("alert-warning");
  } else if (type === "info") {
    toastWrapper.classList.add("alert-info");
  }

  // Create message span
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  toastWrapper.appendChild(messageSpan);

  // Append to the toast container
  toastContainer.appendChild(toastWrapper);

  let dismissTimeout = setTimeout(() => {
    toastWrapper.remove();
  }, calculatedDuration); // Use calculated duration

  // Add event listener to remove toast on click/tap
  toastWrapper.addEventListener("click", () => {
    clearTimeout(dismissTimeout); // Clear the auto-dismiss timeout
    toastWrapper.remove(); // Remove the toast immediately
  });
}

/**
 * Hides all active toast messages.
 */
export function hideMessage() {
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    // Remove all child elements (toasts) from the container
    while (toastContainer.firstChild) {
      toastContainer.removeChild(toastContainer.firstChild);
    }
  }
}

/**
 * Shows a generic confirmation modal.
 * It expects the following DOM elements to be present:
 * - <dialog id="confirmationModal">
 * - #confirmationModalTitle
 * - #confirmationModalText
 * - #confirmActionButton
 * - #cancelConfirmationButton
 * @param {string} title - The title of the modal.
 * @param {string} message - The message to display.
 * @param {string} confirmText - Text for the confirm button.
 * @param {Function} onConfirm - Callback function when confirm is clicked.
 * @param {Function} onCancel - Callback function when cancel is clicked.
 */
export function showConfirmationModal(
  title,
  message,
  confirmText,
  onConfirm,
  onCancel
) {
  const modal = document.getElementById("confirmationModal");
  const modalTitle = document.getElementById("confirmationModalTitle");
  const modalText = document.getElementById("confirmationModalText");
  const confirmBtn = document.getElementById("confirmActionButton");
  const cancelBtn = document.getElementById("cancelConfirmationButton");

  if (!modal || !modalTitle || !modalText || !confirmBtn || !cancelBtn) {
    console.error(
      "Missing required DOM elements for Confirmation Modal. Title:",
      title,
      "Message:",
      message
    );
    // Fallback: use a simple alert if modal elements are missing
    showMessage("error", `${title}\n${message}`); // Replaced alert with showMessage
    onConfirm(); // Act as if confirmed if modal elements aren't there
    return;
  }

  modalTitle.textContent = title;
  modalText.textContent = message;
  confirmBtn.textContent = confirmText;

  // Clear previous listeners to prevent multiple calls
  // Use .removeEventListener for safety
  const oldConfirmListener = confirmBtn.onclick;
  const oldCancelListener = cancelBtn.onclick;
  if (oldConfirmListener)
    confirmBtn.removeEventListener("click", oldConfirmListener);
  if (oldCancelListener)
    cancelBtn.removeEventListener("click", oldCancelListener);

  const newConfirmListener = () => {
    modal.close(); // Close modal using DaisyUI's method
    onConfirm();
  };
  const newCancelListener = () => {
    modal.close(); // Close modal using DaisyUI's method
    onCancel();
  };

  confirmBtn.addEventListener("click", newConfirmListener);
  cancelBtn.addEventListener("click", newCancelListener);

  modal.showModal(); // Show modal using DaisyUI's method

  // Handle closing via backdrop click (ESC key is handled by default for <dialog>)
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      // Only close if clicked on the backdrop
      newCancelListener(); // Treat backdrop click as cancel
    }
  });
}

/**
 * Hides the generic confirmation modal.
 * (Note: With <dialog>.close(), this function might not be directly called from UI elements,
 * but it's good to keep for programmatic hiding if needed.)
 */
export function hideConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  if (modal && modal.open) {
    // Check if modal is currently open
    modal.close();
  }
}

/**
 * Downloads the given data as a CSV file.
 * @param {Array<Object>} data - The array of objects to convert to CSV.
 * @param {Array<string>} headers - An array of strings for the CSV header row.
 * @param {string} fileName - The desired name for the CSV file (e.g., "transactions.csv").
 */
export function downloadCSV(data, headers, fileName) {
  if (!data || data.length === 0) {
    console.warn("No data to download.");
    return; // No data, do nothing
  }

  // Helper to escape CSV values
  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    let stringValue = String(value);
    // Enclose values with commas, double quotes, or newlines in double quotes
    // and escape existing double quotes by doubling them.
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvRows = [
    headers.map(escapeCsv).join(","), // CSV header row
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
          // Special handling for Amount: remove commas before escaping for proper numerical value in CSV
          if (fieldName === "Amount" || fieldName === "Total Amount") {
            const amountValue =
              typeof value === "number"
                ? value.toFixed(2)
                : String(value || "").replace(/,/g, "");
            return escapeCsv(amountValue);
          }
          return escapeCsv(value);
        })
        .join(",")
    ),
  ];
  const csvString = csvRows.join("\n"); // Join all rows with newlines

  // Create a Blob and initiate download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden"; // Hide the link
  document.body.appendChild(link);
  link.click(); // Programmatically click to trigger download
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(url); // Release the object URL
}

/**
 * Parses a date string (DD/MM/YYYY) into a Date object for sorting.
 * @param {string} dateString - The date string in "DD/MM/YYYY" or similar format.
 * @returns {number} The time in milliseconds since the epoch for sorting.
 */
export function parseDateForSorting(dateString) {
  // Handle DD/MM/YYYY
  if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateString.split("/");
    return new Date(`${year}-${month}-${day}`).getTime();
  }
  // Handle ISO-MM-DD
  if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString).getTime();
  }
  // Fallback for other formats Date constructor might handle
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime(); // Return 0 for invalid dates
  } catch (e) {
    return 0; // Return 0 for dates that cause errors
  }
}

/**
 * Formats an amount for display, ensuring 2 decimal places and locale-specific formatting.
 * Handles null, NaN, and error strings gracefully.
 * @param {number|string|null} amount - The amount to format.
 * @returns {string} The formatted amount string or "-" / "Error".
 */
export function formatAmountForDisplay(amount) {
  if (
    amount === null ||
    isNaN(amount) ||
    amount === "-" ||
    amount === "Error" ||
    amount === undefined ||
    String(amount).trim() === ""
  ) {
    return amount === "Error" ? "Error" : "-";
  }
  let parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return "-";
  }
  // Format with thousands separators and two decimal places
  return parsedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a date string for display in DD/MM/YYYY format.
 * Handles various date formats (DD/MM/YYYY, ISO-MM-DD, or general date strings).
 * @param {string} dateString - The date string to format.
 * @returns {string} The formatted date string or the original string if invalid.
 */
export function formatDateForDisplay(dateString) {
  if (!dateString || dateString === "-" || dateString === "Error")
    return dateString;
  try {
    let date;
    // Attempt to parse DD/MM/YYYY
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateString.split("/");
      date = new Date(parts[2], parts[1] - 1, parts[0]);
    }
    // Attempt to parse ISO-MM-DD
    else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(dateString);
    }
    // Fallback for other formats
    else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      // If date is invalid, return original string
      return dateString;
    }

    // Format to DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()); // Get full four digits of year
    return `${day}/${month}/${year}`;
  } catch (e) {
    // If any error during parsing/formatting, return original string
    console.error("Error formatting date:", e);
    return dateString;
  }
}

/**
 * Simulates a FileList object from an array of files.
 * This is sometimes needed for compatibility with DOM APIs expecting a FileList.
 * @param {Array<File>} files - An array of File objects.
 * @returns {FileList} A FileList-like object.
 */
export function FileListShim(files) {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  return dt.files;
}
