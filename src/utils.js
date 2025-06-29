let pdfjsLibInstance = null;
let pdfWorkerUrlInstance = null;

export async function getPDFLib() {
  if (pdfjsLibInstance && pdfWorkerUrlInstance) {
    return pdfjsLibInstance;
  }

  const [pdfjs, pdfWorker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);

  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
  pdfjsLibInstance = pdfjs;
  pdfWorkerUrlInstance = pdfWorker.default;

  return pdfjsLibInstance;
}

export function getGeminiApiKey() {
  return localStorage.getItem("geminiApiKey") || "";
}

export function setGeminiApiKey(key) {
  localStorage.setItem("geminiApiKey", key);
}

export function showApiKeyModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById("shared-api-key-modal");
    const input = document.getElementById("shared-api-key-input");
    const saveBtn = document.getElementById("shared-api-key-save-btn");
    const cancelBtn = document.getElementById("shared-api-key-cancel-btn");

    if (!modal || !input || !saveBtn || !cancelBtn) {
      resolve(null);
      return;
    }

    input.value = getGeminiApiKey();
    modal.showModal();

    const handleSave = () => {
      const key = input.value.trim();
      if (key) {
        setGeminiApiKey(key);
        modal.close();
        saveBtn.removeEventListener("click", handleSave);
        cancelBtn.removeEventListener("click", handleCancel);
        resolve(key);
      } else {
        showMessage("warning", "Please enter a valid Gemini API key.");
      }
    };

    const handleCancel = () => {
      modal.close();
      saveBtn.removeEventListener("click", handleSave);
      cancelBtn.removeEventListener("click", handleCancel);
      resolve(null);
    };

    saveBtn.addEventListener("click", handleSave);
    cancelBtn.addEventListener("click", handleCancel);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        handleCancel();
      }
    });
  });
}

export function showMessage(type, message, duration = null) {
  const toastContainer = document.getElementById("toast-container");

  if (!toastContainer) {
    return;
  }

  let calculatedDuration = duration;
  if (calculatedDuration === null) {
    const minDuration = 5000;
    const wordsPerSecond = 2;
    const words = message.split(/\s+/).filter((word) => word.length > 0).length;
    calculatedDuration = Math.max(minDuration, (words / wordsPerSecond) * 1000);
  }

  const toastWrapper = document.createElement("div");
  toastWrapper.className = "alert cursor-pointer";

  if (type === "error") {
    toastWrapper.classList.add("alert-error");
  } else if (type === "success") {
    toastWrapper.classList.add("alert-success");
  } else if (type === "warning") {
    toastWrapper.classList.add("alert-warning");
  } else if (type === "info") {
    toastWrapper.classList.add("alert-info");
  }

  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  toastWrapper.appendChild(messageSpan);

  toastContainer.appendChild(toastWrapper);

  let dismissTimeout = setTimeout(() => {
    toastWrapper.remove();
  }, calculatedDuration);

  toastWrapper.addEventListener("click", () => {
    clearTimeout(dismissTimeout);
    toastWrapper.remove();
  });
}

export function hideMessage() {
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    while (toastContainer.firstChild) {
      toastContainer.removeChild(toastContainer.firstChild);
    }
  }
}

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
    showMessage("error", `${title}\n${message}`);
    onConfirm();
    return;
  }

  confirmBtn.onclick = null;
  cancelBtn.onclick = null;

  const newConfirmListener = () => {
    modal.close();
    confirmBtn.removeEventListener("click", newConfirmListener);
    cancelBtn.removeEventListener("click", newCancelListener);
    modal.removeEventListener("click", modalOutsideClickListener);
    onConfirm();
  };
  const newCancelListener = () => {
    modal.close();
    confirmBtn.removeEventListener("click", newConfirmListener);
    cancelBtn.removeEventListener("click", newCancelListener);
    modal.removeEventListener("click", modalOutsideClickListener);
    onCancel();
  };

  const modalOutsideClickListener = (event) => {
    if (event.target === modal) {
      newCancelListener();
    }
  };

  modalTitle.textContent = title;
  modalText.textContent = message;
  confirmBtn.textContent = confirmText;

  confirmBtn.addEventListener("click", newConfirmListener);
  cancelBtn.addEventListener("click", newCancelListener);
  modal.addEventListener("click", modalOutsideClickListener);

  modal.showModal();
}

export function hideConfirmationModal() {
  const modal = document.getElementById("confirmationModal");
  if (modal && modal.open) {
    modal.close();
  }
}

export function downloadCSV(data, headers, fileName) {
  if (!data || data.length === 0) {
    return;
  }

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    let stringValue = String(value);
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
    headers.map(escapeCsv).join(","),
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
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
  const csvString = csvRows.join("\n");

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseDateForSorting(dateString) {
  if (dateString && dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    const [day, month, year] = dateString.split("/");
    return new Date(`${year}-${month}-${day}`).getTime();
  }
  if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(dateString).getTime();
  }
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  } catch (e) {
    return 0;
  }
}

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
  return parsedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateForDisplay(dateString) {
  if (!dateString || dateString === "-" || dateString === "Error")
    return dateString;
  try {
    let date;
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateString.split("/");
      date = new Date(parts[2], parts[1] - 1, parts[0]);
    } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateString;
  }
}

export function FileListShim(files) {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  return dt.files;
}

export function removeElementAtIndex(array, index) {
  if (index > -1 && index < array.length) {
    array.splice(index, 1);
  }
  return array;
}
