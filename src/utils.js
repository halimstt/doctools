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
  if (dateString) {
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = dateString.split("/");
      return new Date(`${year}-${month}-${day}`).getTime();
    }
    if (dateString.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
      const [day, month, yearTwoDigit] = dateString.split("/");
      const currentYear = new Date().getFullYear();
      const fullYear =
        parseInt(yearTwoDigit, 10) +
        (parseInt(yearTwoDigit, 10) > (currentYear % 100) + 20 ? 1900 : 2000);
      return new Date(`${fullYear}-${month}-${day}`).getTime();
    }
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateString).getTime();
    }
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

export function filterPdfFiles(files) {
  return Array.from(files).filter((file) => file.type === "application/pdf");
}

export function logDebug(message) {}

export function showNoDocumentSelectedModal() {
  showMessage(
    "info",
    "Please select a document from the 'Extract' tab first to proceed."
  );
}

export function extractDataWithRegex(pdfText, config) {
  const extracted = {
    supplierName: null,
    documentDate: null,
    documentNumber: null,
    totalAmount: null,
  };

  const extractValue = (text, pattern) => {
    if (!pattern) return null;
    try {
      const regex = new RegExp(pattern, "i");
      const match = text.match(regex);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
      return null;
    } catch (e) {
      console.error("Invalid regex pattern:", e);
      return null;
    }
  };

  if (config) {
    extracted.supplierName = extractValue(pdfText, config.supplierNamePattern);
    let docDate = extractValue(pdfText, config.documentDatePattern);
    extracted.documentDate = docDate;

    let docNumber = extractValue(pdfText, config.documentNumberPattern);
    if (docNumber) {
      docNumber = docNumber
        .replace(/\s*-\s*/g, "-")
        .replace(/\s+/g, "")
        .trim();
    }
    extracted.documentNumber = docNumber;

    const totalAmountStr = extractValue(pdfText, config.totalAmountPattern);
    if (totalAmountStr) {
      const cleanedAmount = totalAmountStr.replace(/[^0-9.]/g, "");
      const parsedAmount = parseFloat(cleanedAmount);
      if (!isNaN(parsedAmount)) {
        extracted.totalAmount = parsedAmount;
      }
    }
  }
  return extracted;
}

export function classifyDocumentHeuristically(pdfText, configurations) {
  let scores = [];

  const testPattern = (text, pattern) => {
    if (!pattern) return false;
    try {
      return new RegExp(pattern, "i").test(text);
    } catch (e) {
      console.error("Invalid regex pattern for classification:", e);
      return false;
    }
  };

  for (const config of configurations) {
    let currentScore = 0;
    if (testPattern(pdfText, config.supplierNamePattern)) {
      currentScore += 4;
    }
    if (testPattern(pdfText, config.documentNumberPattern)) {
      currentScore += 3;
    }
    if (testPattern(pdfText, config.totalAmountPattern)) {
      currentScore += 2;
    }
    if (testPattern(pdfText, config.documentDatePattern)) {
      currentScore += 1;
    }

    if (currentScore > 0) {
      scores.push({ configName: config.name, score: currentScore });
    }
  }

  if (scores.length === 0) {
    return { matchedConfigName: "None" };
  }

  scores.sort((a, b) => b.score - a.score);
  const bestMatch = scores[0];

  if (bestMatch.score >= 10) {
    return { matchedConfigName: bestMatch.configName };
  } else {
    return { matchedConfigName: "None" };
  }
}

export function setTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("theme", themeName);

  const themeControllers = document.querySelectorAll(".theme-controller");
  themeControllers.forEach((controller) => {
    if (controller.value === themeName) {
      controller.checked = true;
      controller.classList.remove("btn-ghost");
      controller.classList.add("btn-primary");
    } else {
      controller.checked = false;
      controller.classList.remove("btn-primary");
      controller.classList.add("btn-ghost");
    }
  });
}
