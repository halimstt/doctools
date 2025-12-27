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


// DOM manipulation functions removed. Use UIContext in React components.

/* 
export function showApiKeyModal() { ... }
export function showMessage(type, message, duration = null) { ... }
export function hideMessage() { ... }
export function showConfirmationModal(...) { ... }
export function hideConfirmationModal() { ... }
*/

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

export function logDebug(message) { }





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

export function getMonthYear(dateStr) {
  if (!dateStr) return "Unknown Date";
  try {
    let date;
    // Handle DD/MM/YYYY
    const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return "Unknown Date";

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return "Unknown Date";
  }
}
