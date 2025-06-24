// utils.js

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
 * - #shared-api-key-modal
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
    modal.classList.remove("hidden"); // Show modal

    const handleSave = () => {
      const key = input.value.trim();
      if (key) {
        setGeminiApiKey(key);
        modal.classList.add("hidden");
        saveBtn.removeEventListener("click", handleSave);
        cancelBtn.removeEventListener("click", handleCancel);
        resolve(key);
      } else {
        // This message should ideally be handled by a page-specific message system,
        // or the modal itself would need a message display area.
        // For simplicity, we'll assume the calling page has its own message display.
        console.warn("Please enter a valid Gemini API key.");
      }
    };

    const handleCancel = () => {
      modal.classList.add("hidden");
      saveBtn.removeEventListener("click", handleSave);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(null);
    };

    saveBtn.addEventListener("click", handleSave);
    cancelBtn.addEventListener("click", handleCancel);
  });
}

/**
 * Displays a message in a designated container.
 * It expects the following DOM elements to be present:
 * - #message-container
 * - #message-prefix
 * - #message-text
 * - #close-message-btn
 * @param {'error'|'success'|'warning'} type - The type of message (determines styling).
 * @param {string} message - The message content.
 */
export function showMessage(type, message) {
  const messageContainer = document.getElementById("message-container");
  const messagePrefix = document.getElementById("message-prefix");
  const messageText = document.getElementById("message-text");
  const closeMessageBtn = document.getElementById("close-message-btn");

  if (!messageContainer || !messagePrefix || !messageText || !closeMessageBtn) {
    console.error(
      "Missing required DOM elements for Message Container. Message:",
      message
    );
    return;
  }

  messageContainer.classList.remove("hidden");
  messageContainer.classList.remove(
    "message-error",
    "message-success",
    "message-warning"
  );

  if (type === "error") {
    messageContainer.classList.add("message-error");
    messagePrefix.textContent = "Error!";
  } else if (type === "success") {
    messageContainer.classList.add("message-success");
    messagePrefix.textContent = "Success!";
  } else if (type === "warning") {
    messageContainer.classList.add("message-warning");
    messagePrefix.textContent = "Warning!";
  }
  messageText.textContent = message;

  closeMessageBtn.onclick = hideMessage; // Set listener to hide on click
}

/**
 * Hides the message container.
 */
export function hideMessage() {
  const messageContainer = document.getElementById("message-container");
  const messagePrefix = document.getElementById("message-prefix");
  const messageText = document.getElementById("message-text");
  if (messageContainer) {
    messageContainer.classList.add("hidden");
    if (messagePrefix) messagePrefix.textContent = "";
    if (messageText) messageText.textContent = "";
  }
}

/**
 * Shows a generic confirmation modal.
 * It expects the following DOM elements to be present:
 * - #confirmationModal
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
    alert(`${title}\n${message}`);
    onConfirm(); // Act as if confirmed if modal elements aren't there
    return;
  }

  modalTitle.textContent = title;
  modalText.textContent = message;
  confirmBtn.textContent = confirmText;

  // Clear previous listeners to prevent multiple calls
  confirmBtn.onclick = null;
  cancelBtn.onclick = null;

  confirmBtn.onclick = () => {
    hideConfirmationModal();
    onConfirm();
  };
  cancelBtn.onclick = () => {
    hideConfirmationModal();
    onCancel();
  };

  modal.classList.remove("hidden");
}

/**
 * Hides the generic confirmation modal.
 */
export function hideConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  if (modal) {
    modal.classList.add("hidden");
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
  // Handle YYYY-MM-DD
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
