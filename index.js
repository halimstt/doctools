// index.js

// --- 1. Global Variables and DOM Elements ---
// Caching DOM elements for efficient access
const parserSelect = document.getElementById("parser-select");
const uploadArea = document.getElementById("upload-area");
const fileInput = document.getElementById("file-input");
const uploadLabel = document.getElementById("upload-label");
const fileInfo = document.getElementById("file-info");
const filePillsContainer = document.getElementById("file-pills-container");
const removeAllFilesBtn = document.getElementById("remove-all-files-btn");
const processBtn = document.getElementById("process-btn");
const downloadBtn = document.getElementById("download-btn");
const statusText = document.getElementById("status-text");
const processBtnText = document.getElementById("process-btn-text");
const spinner = document.getElementById("spinner");
const resultsContainer = document.getElementById("results-container");
const tableBody = document.getElementById("results-table-body");

const apiKeyModal = document.getElementById("api-key-modal");
const geminiApiKeyInput = document.getElementById("gemini-api-key-input");
const apiKeySaveBtn = document.getElementById("api-key-save-btn");
const apiKeyCancelBtn = document.getElementById("api-key-cancel-btn");

const messageContainer = document.getElementById("message-container");
const messagePrefix = document.getElementById("message-prefix");
const messageText = document.getElementById("message-text");

// Application state variables
let selectedFiles = [];
let allTransactions = [];
let geminiApiKey = localStorage.getItem("geminiApiKey") || "";
let resolveApiKeyPromise; // Used to resolve the promise from the API key modal

// --- 2. Utility Functions ---

/**
 * Applies the dark or light theme to the document.
 * @param {boolean} isDarkMode - True if dark mode should be applied, false for light mode.
 */
function applyTheme(isDarkMode) {
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Displays a message in the message container.
 * @param {'error'|'success'} type - The type of message (determines styling).
 * @param {string} message - The message content.
 */
function showMessage(type, message) {
  messageContainer.classList.remove("hidden");
  // Reset existing classes to avoid conflicts
  messageContainer.classList.remove(
    "bg-red-100",
    "border-red-400",
    "text-red-700",
    "bg-green-100",
    "border-green-400",
    "text-green-700",
    "dark:bg-red-900",
    "dark:border-red-700",
    "dark:text-red-300",
    "dark:bg-green-900",
    "dark:border-green-700",
    "dark:text-green-300"
  );

  // Apply appropriate classes based on message type
  if (type === "error") {
    messageContainer.classList.add(
      "bg-red-100",
      "border-red-400",
      "text-red-700",
      "dark:bg-red-900",
      "dark:border-red-700",
      "dark:text-red-300"
    );
    messagePrefix.textContent = "Error!";
  } else if (type === "success") {
    messageContainer.classList.add(
      "bg-green-100",
      "border-green-400",
      "text-green-700",
      "dark:bg-green-900",
      "dark:border-green-700",
      "dark:text-green-300"
    );
    messagePrefix.textContent = "Success!";
  }
  messageText.textContent = message;
}

/**
 * Hides the message container.
 */
function hideMessage() {
  messageContainer.classList.add("hidden");
  messagePrefix.textContent = "";
  messageText.textContent = "";
}

/**
 * Displays the API key modal and returns a promise that resolves with the entered key or null.
 * @returns {Promise<string|null>} A promise that resolves with the Gemini API key or null if canceled.
 */
function showApiKeyModal() {
  return new Promise((resolve) => {
    resolveApiKeyPromise = resolve; // Store resolve for external access

    geminiApiKeyInput.value = geminiApiKey; // Pre-fill with existing key
    apiKeyModal.style.display = "flex"; // Show modal

    // Event listener for saving the API key
    apiKeySaveBtn.onclick = () => {
      const key = geminiApiKeyInput.value.trim();
      if (key) {
        localStorage.setItem("geminiApiKey", key); // Save to local storage
        geminiApiKey = key; // Update global variable
        apiKeyModal.style.display = "none"; // Hide modal
        resolve(key); // Resolve the promise with the key
      } else {
        showMessage("error", "Please enter a valid Gemini API key.");
      }
    };

    // Event listener for canceling API key input
    apiKeyCancelBtn.onclick = () => {
      apiKeyModal.style.display = "none"; // Hide modal
      resolve(null); // Resolve the promise with null
    };
  });
}

/**
 * Parses a date string (DD/MM/YY) into a Date object for sorting.
 * Assumes 2-digit years are in the 21st century (20xx) if <= current year's last two digits,
 * or 20th century (19xx) if > current year's last two digits (e.g., 90 -> 1990, 10 -> 2010).
 * @param {string} dateString - The date string in "DD/MM/YY" format.
 * @returns {number} The time in milliseconds since the epoch for sorting.
 */
function parseDateForSorting(dateString) {
  const [day, month, year] = dateString.split("/");
  // Heuristic for 2-digit year: if 'YY' is less than or equal to current year's 'YY', assume 20YY, else 19YY.
  const currentFullYear = new Date().getFullYear();
  const currentTwoDigitYear = parseInt(String(currentFullYear).slice(-2), 10);
  const parsedTwoDigitYear = parseInt(year, 10);

  const fullYear =
    parsedTwoDigitYear <= currentTwoDigitYear
      ? `20${String(parsedTwoDigitYear).padStart(2, "0")}`
      : `19${String(parsedTwoDigitYear).padStart(2, "0")}`;

  return new Date(`${fullYear}-${month}-${day}`).getTime();
}

/**
 * Downloads the given data as a CSV file.
 * @param {Array<Object>} data - The array of transaction objects to convert to CSV.
 */
function downloadCSV(data) {
  if (!data.length) return; // Exit if no data

  const headers = ["Date", "Description", "Amount"];
  const csvRows = [
    headers.join(","), // CSV header row
    ...data.map((row) =>
      headers
        .map((fieldName) => {
          const value = row[fieldName];
          const stringValue = value === null ? "" : String(value); // Handle null/undefined
          // Enclose values with commas, double quotes, or newlines in double quotes
          // and escape existing double quotes by doubling them.
          return stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
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
  link.setAttribute("download", "transactions.csv");
  link.style.visibility = "hidden"; // Hide the link
  document.body.appendChild(link);
  link.click(); // Programmatically click to trigger download
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(url); // Release the object URL
}

// --- 3. UI Management Functions ---

/**
 * Resets the UI to its initial state, clearing selected files and processed results.
 */
function resetUI() {
  selectedFiles = [];
  allTransactions = [];
  fileInput.value = ""; // Clear file input selection
  fileInfo.classList.add("hidden"); // Hide file info section
  uploadLabel.classList.remove("hidden"); // Show upload label
  processBtn.disabled = true; // Disable process button
  statusText.textContent = ""; // Clear status text
  hideMessage(); // Hide any active messages
  updateFileDisplay(); // Update file display (should show no files)
  processBtnText.textContent = "Process"; // Reset process button text
  spinner.classList.add("hidden"); // Hide spinner
  displayTransactions([]); // Clear results table
  updateDownloadButtonState(); // Update download button state
}

/**
 * Updates the display of selected files in the UI.
 */
function updateFileDisplay() {
  filePillsContainer.innerHTML = ""; // Clear existing pills
  if (selectedFiles.length === 0) {
    fileInfo.classList.add("hidden"); // Hide file info
    uploadLabel.classList.remove("hidden"); // Show upload prompt
  } else {
    // Create and append a pill for each selected file
    selectedFiles.forEach((file, index) => {
      const pill = document.createElement("span");
      pill.className =
        "inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100 text-xs font-medium mr-2 mb-2";
      pill.innerHTML = `
        ${file.name}
        <button type="button" class="ml-2 -mr-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" data-index="${index}">
          <span class="sr-only">Remove file</span>
          <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
          </svg>
        </button>
      `;
      // Add event listener to remove individual file when button is clicked
      pill.querySelector("button").addEventListener("click", (event) => {
        const fileIndexToRemove = parseInt(event.currentTarget.dataset.index);
        removeIndividualFile(fileIndexToRemove);
      });
      filePillsContainer.appendChild(pill);
    });
    fileInfo.classList.remove("hidden"); // Show file info
    uploadLabel.classList.add("hidden"); // Hide upload prompt
  }
  processBtn.disabled = selectedFiles.length === 0; // Enable/disable process button
}

/**
 * Displays an array of transaction objects in the results table.
 * @param {Array<Object>} data - An array of transaction objects.
 */
function displayTransactions(data) {
  tableBody.innerHTML = ""; // Clear existing rows

  if (!data || data.length === 0) {
    // Display "No documents processed yet" message if no data
    const noResultsRow = document.createElement("tr");
    noResultsRow.innerHTML = `
      <td colspan="3" class="px-6 py-4 text-center">
        No documents processed yet.
      </td>
    `;
    tableBody.appendChild(noResultsRow);
    return;
  }

  try {
    data.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className =
        "divide-light-border dark:divide-dark-border hover:bg-gray-50 dark:hover:bg-gray-700";

      // Date column
      const tdDate = document.createElement("td");
      tdDate.className = "px-6 py-4";
      tdDate.textContent = row.Date || "";
      tr.appendChild(tdDate);

      // Description column
      const tdDescription = document.createElement("td");
      tdDescription.className = "px-6 py-4";
      tdDescription.textContent = row.Description || "";
      tr.appendChild(tdDescription);

      // Amount column with conditional styling for positive/negative
      const tdAmount = document.createElement("td");
      tdAmount.className = "px-6 py-4";
      const value = row.Amount || "";
      tdAmount.textContent = value;
      if (typeof value === "string" && value.trim() !== "") {
        const amount = parseFloat(value);
        tdAmount.classList.add("text-right", "font-mono"); // Right-align and monospace font
        tdAmount.classList.toggle("text-green-600", amount > 0); // Green for positive
        tdAmount.classList.toggle("text-red-600", amount < 0); // Red for negative
        tdAmount.classList.toggle("dark:text-green-400", amount > 0);
        tdAmount.classList.toggle("dark:text-red-400", amount < 0);
      }
      tr.appendChild(tdAmount);
      tableBody.appendChild(tr);
    });
  } catch (e) {
    showMessage(
      "error",
      "Could not display results due to an internal error. Check the console."
    );
    console.error("Error displaying transactions:", e);
  }
}

/**
 * Updates the enabled/disabled state of the download button based on whether there are results.
 */
function updateDownloadButtonState() {
  // Check if the table body has content other than the "No documents processed yet" message
  const hasResults =
    tableBody.children.length > 0 &&
    tableBody.children[0].textContent.trim() !== "No documents processed yet.";

  downloadBtn.disabled = !hasResults; // Disable if no results
}

// --- 4. Event Handlers ---

/**
 * Handles file selection from input or drag-and-drop.
 * Filters for PDF files and applies parser-specific rules (e.g., single file for Maybank PDF).
 * @param {FileList} files - The FileList object from the event.
 */
function handleFiles(files) {
  const currentParser = parserSelect.value;
  // Filter for PDF files
  const pdfFiles = Array.from(files).filter(
    (file) => file.type === "application/pdf"
  );

  if (pdfFiles.length === 0) {
    showMessage("error", "Please select valid PDF file(s).");
    if (selectedFiles.length === 0) {
      processBtn.disabled = true; // Keep process button disabled if no files total
    }
    return;
  }

  if (currentParser === "maybank-pdf") {
    // Maybank PDF parser only supports one file
    if (pdfFiles.length > 1) {
      showMessage(
        "error",
        "Maybank PDF Statement parser supports only one PDF file at a time. Only the first file will be used."
      );
    }
    selectedFiles = [pdfFiles[0]]; // Take only the first PDF
  } else {
    // For other parsers, add new unique PDF files to selectedFiles
    pdfFiles.forEach((newFile) => {
      // Check for uniqueness based on name and size
      if (
        !selectedFiles.some(
          (existingFile) =>
            existingFile.name === newFile.name &&
            existingFile.size === newFile.size
        )
      ) {
        selectedFiles.push(newFile);
      }
    });
  }

  updateFileDisplay(); // Refresh the file display in UI
  processBtn.disabled = selectedFiles.length === 0; // Enable/disable process button
  hideMessage(); // Clear any previous messages
}

/**
 * Removes an individual file from the `selectedFiles` array and updates the display.
 * @param {number} indexToRemove - The index of the file to remove.
 */
function removeIndividualFile(indexToRemove) {
  selectedFiles.splice(indexToRemove, 1); // Remove file from array
  updateFileDisplay(); // Update UI
  if (selectedFiles.length === 0) {
    hideMessage(); // Hide message if no files are left
  }
}

/**
 * Main function to process the selected PDF statements based on the chosen parser.
 */
async function processStatements() {
  if (selectedFiles.length === 0) {
    showMessage("error", "Please select at least one PDF file first.");
    return;
  }

  // Disable UI elements and show loading indicators
  processBtn.disabled = true;
  spinner.classList.remove("hidden");
  processBtnText.textContent = "Processing...";
  statusText.textContent = "";
  hideMessage(); // Clear previous messages

  allTransactions = []; // Reset transactions for new processing
  const currentParser = parserSelect.value;

  // Prompt for Gemini API key if required and not present
  if (currentParser === "gemini-parser" && !geminiApiKey) {
    try {
      const key = await showApiKeyModal(); // Wait for key input
      if (!key) {
        showMessage(
          "error",
          "Gemini API key is required for this parser. Processing canceled."
        );
        resetUI(); // Reset UI if key not provided
        return;
      }
    } catch (error) {
      showMessage(
        "error",
        "Could not get Gemini API key. Processing canceled."
      );
      resetUI();
      return;
    }
  }

  try {
    // Process each selected file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      statusText.textContent = `Processing ${file.name} (${i + 1}/${
        selectedFiles.length
      })...`;

      // Read PDF file as ArrayBuffer
      const fileReader = new FileReader();
      const fileReadPromise = new Promise((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target.result);
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
      });

      const typedarray = new Uint8Array(await fileReadPromise);
      const pdf = await pdfjsLib.getDocument(typedarray).promise; // Load PDF document

      let fileTransactions = [];

      // Choose parser based on selection
      switch (currentParser) {
        case "maybank-pdf":
          // Only process the first file if Maybank PDF is selected and multiple are uploaded
          if (selectedFiles.length > 1 && i > 0) {
            continue; // Skip subsequent files
          }
          statusText.textContent = `Analyzing content in ${file.name} (Maybank PDF mode)...`;
          const allLinesFromPdf = await extractTextLinesFromPdfMaybankPdf(pdf);
          fileTransactions = parseTransactionsMaybankPdf(allLinesFromPdf);
          break;
        case "maybank-web":
          statusText.textContent = `Analyzing content in ${file.name} (Maybank Web mode)...`;
          const highAccuracyText = await getHighAccuracyTextFromPdfMaybankWeb(
            pdf
          );
          fileTransactions =
            parseTextAndGenerateCsvMaybankWeb(highAccuracyText);
          break;
        case "gemini-parser":
          statusText.textContent = `Sending pages of ${file.name} to AI for processing...`;
          fileTransactions = await processGeminiStatementWithAI(
            pdf,
            geminiApiKey
          );
          break;
        default:
          showMessage(
            "error",
            "Invalid parser selected. Please choose a valid statement type."
          );
          throw new Error("Invalid parser selected.");
      }
      allTransactions = allTransactions.concat(fileTransactions); // Aggregate transactions
    }

    // Sort all transactions by date in descending order (latest first)
    allTransactions.sort((a, b) => {
      const dateA = parseDateForSorting(a["Date"]);
      const dateB = parseDateForSorting(b["Date"]);
      return dateB - dateA;
    });

    statusText.textContent = ""; // Clear status message
    displayTransactions(allTransactions); // Display results in table
    updateDownloadButtonState(); // Enable/disable download button

    if (allTransactions.length > 0) {
      showMessage(
        "success",
        `${selectedFiles.length} PDF(s) processed and combined CSV ready for download!`
      );
    } else {
      showMessage(
        "error",
        "No valid transactions were extracted from the selected PDF(s). Please check your file(s) and selected parser type."
      );
    }
  } catch (error) {
    showMessage(
      "error",
      `An error occurred during PDF conversion: ${error.message}. Please check the console for details and ensure your Gemini API is enabled for this project if using the AI parser.`
    );
    console.error("Processing error:", error);
  } finally {
    // Re-enable UI elements and hide loading indicators
    processBtn.disabled = false;
    spinner.classList.add("hidden");
    processBtnText.textContent = "Process";
    statusText.textContent = "Processing your statements..."; // Reset initial status
  }
}

// --- 5. Core Parsing Logic Functions ---

/**
 * Extracts text lines from a PDF document, preserving vertical order, for Maybank PDF parsing.
 * @param {Object} pdf - The PDFDocumentProxy object from pdf.js.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of text lines.
 */
async function extractTextLinesFromPdfMaybankPdf(pdf) {
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lines = {}; // Group text items by their y-coordinate
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]); // Y-coordinate, rounded
      if (!lines[y]) lines[y] = [];
      lines[y].push(item);
    }
    // Sort y-coordinates from top to bottom (descending)
    const sortedY = Object.keys(lines).sort((a, b) => b - a);
    for (const y of sortedY) {
      // Sort items within each line by x-coordinate (left to right)
      lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
      allLines.push(lines[y].map((item) => item.str).join(" ")); // Join items into a line string
    }
  }
  return allLines;
}

/**
 * Parses transactions from an array of text lines specific to Maybank PDF format.
 * @param {Array<string>} allLinesFromPdf - The text lines extracted from the PDF.
 * @returns {Array<Object>} An array of parsed transaction objects.
 */
function parseTransactionsMaybankPdf(allLinesFromPdf) {
  // Extract year from "STATEMENT DATE" if present, otherwise use current year
  const statementDateMatch = allLinesFromPdf
    .join(" ")
    .match(/STATEMENT DATE\s*:\s*(\d{2}\/\d{2}\/\d{2})/i);
  const year = statementDateMatch
    ? `20${statementDateMatch[1].slice(-2)}`
    : new Date().getFullYear().toString();

  const filteredLines = [];
  let inTransactionBlock = false;

  // Filter lines to isolate the transaction block
  for (const line of allLinesFromPdf) {
    if (/ACCOUNT\s*TRANSACTIONS/i.test(line)) {
      inTransactionBlock = true; // Start transaction block
      continue;
    }
    if (/BAKI\s*LEGAR/i.test(line)) {
      inTransactionBlock = false; // End transaction block
      continue;
    }
    if (inTransactionBlock) {
      // Skip header lines within the transaction block
      if (/TARIKH\s*MASUK/i.test(line) && /TARIKH\s*NILAI/i.test(line))
        continue;
      if (/進支日期/i.test(line) && /仄過賬日期/.test(line)) continue;
      if (/ENTRY\s*DATE/i.test(line) && /VALUE\s*DATE/i.test(line)) continue;
      if (/BEGINNING\s*BALANCE/i.test(line)) continue;
      if (line.trim() === "=") continue; // Skip separator lines
      filteredLines.push(line);
    }
  }

  const transactions = [];
  let descriptionParts = []; // To handle multi-line descriptions

  // Process lines in reverse to handle descriptions that might span multiple lines
  for (const line of [...filteredLines].reverse()) {
    // Lines to ignore (footers, totals, etc.)
    const isIgnoreLine =
      /TIADA\s*URUSNIAGA/i.test(line) ||
      /NO\s*TRANSACTION/i.test(line) ||
      /TOTAL\s*DEBIT/i.test(line) ||
      /ENDING\s*BALANCE/i.test(line) ||
      /LEDGER\s*BALANCE/i.test(line);

    if (isIgnoreLine) {
      descriptionParts = []; // Clear description parts if an ignore line is hit
      continue;
    }

    // Regex to match transaction lines: Date, Description, Amount with sign
    const txMatch = line.match(
      /^\s*(\d{2}\/\d{2})\s+(.*?)\s+([\d,]*\.\d{1,2}[+-])(?:\s+[\d,]*\.\d{2})?$/
    );

    if (txMatch) {
      let date = txMatch[1];
      let description = txMatch[2];
      const amountWithSign = txMatch[3];

      // Clean and parse the amount
      const amountStr = amountWithSign.replace(/,/g, "").replace(/[+-]$/, "");
      const sign = amountWithSign.slice(-1);
      let amount = parseFloat(amountStr);
      if (sign === "-") amount = -amount; // Apply negative sign if debit

      // If date is missing but found in accumulated description parts, extract it
      if (!date && descriptionParts.length > 0) {
        const dateInDescIndex = descriptionParts.findIndex((p) =>
          /^\d{2}\/\d{2}/.test(p.trim())
        );
        if (dateInDescIndex > -1) {
          const lineWithDate = descriptionParts.splice(dateInDescIndex, 1)[0];
          date = lineWithDate.trim().substring(0, 5); // Extract date
          description =
            lineWithDate.trim().substring(5).trim() + " " + description; // Prepend remaining part to description
        }
      }

      // Combine description parts with the current line's description
      if (descriptionParts.length > 0) {
        description =
          description.trim() + " " + descriptionParts.reverse().join(" ");
      }

      // Add transaction if a date is found
      if (date) {
        transactions.push({
          Date: `${date}/${year.slice(-2)}`, // Append 2-digit year
          Description: description,
          Amount: amount,
        });
      }
      descriptionParts = []; // Reset description parts for next transaction
    } else {
      // If it's not a transaction line, add it to description parts if not empty
      if (line.trim().length > 1) {
        descriptionParts.push(line.trim());
      }
    }
  }

  // Reverse the transactions to correct order and format descriptions and amounts
  const finalTransactions = transactions.reverse().map((t) => {
    // Clean and normalize description
    const cleanedDesc = t.Description.replace(/TRANSFER FR A\/C/gi, "")
      .replace(/TRANSFER TO A\/C/gi, "")
      .replace(/PAYMENT FR A\/C/gi, "")
      .replace(/MBB CT-?/gi, "")
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .trim();

    // CSV escape description if necessary
    const finalDescription =
      cleanedDesc.includes(",") ||
      cleanedDesc.includes('"') ||
      cleanedDesc.includes("\n")
        ? `"${cleanedDesc.replace(/"/g, '""')}"`
        : cleanedDesc;

    return {
      Date: t.Date,
      Description: finalDescription,
      Amount: parseFloat(t.Amount).toFixed(2), // Format amount to 2 decimal places
    };
  });
  return finalTransactions;
}

/**
 * Extracts high-accuracy text content from a PDF document, designed for Maybank Web download PDFs.
 * This method attempts to preserve line breaks more accurately by considering Y-coordinates.
 * @param {Object} pdf - The PDFDocumentProxy object from pdf.js.
 * @returns {Promise<string>} A promise that resolves to the full text content.
 */
async function getHighAccuracyTextFromPdfMaybankWeb(pdf) {
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let lastY = -1;
    let lineText = "";

    // Sort text items by Y-coordinate (descending) and then X-coordinate (ascending)
    textContent.items.sort((a, b) => {
      if (a.transform[5] < b.transform[5]) return 1; // Higher Y-coordinate comes first
      if (a.transform[5] > b.transform[5]) return -1;
      if (a.transform[4] < b.transform[4]) return -1; // Smaller X-coordinate comes first
      if (a.transform[4] > b.transform[4]) return 1;
      return 0;
    });

    for (const item of textContent.items) {
      // If the Y-coordinate significantly changes, it's a new line
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        fullText += lineText.trim() + "\n"; // Add trimmed line and newline
        lineText = ""; // Reset line text
      }
      lineText += item.str + " "; // Append text item to current line
      lastY = item.transform[5]; // Update last Y-coordinate
    }
    fullText += lineText.trim() + "\n"; // Add the last line of the page
  }
  return fullText;
}

/**
 * Parses transaction data from text content, specific to Maybank Web download format.
 * @param {string} text - The raw text content extracted from the PDF.
 * @returns {Array<Object>} An array of parsed transaction objects.
 */
function parseTextAndGenerateCsvMaybankWeb(text) {
  const transactions = [];
  const dateRegex = /^\d{1,2}\s+\w{3}\s+\d{4}/; // Matches "DD Mon YYYY"
  const amountRegex = /(-?)\s*RM\s*([\d,]+\.\d{2})\s*$/; // Matches optional "-", "RM", digits/commas, decimals, at end of line

  const lines = text.split("\n");
  let currentTransaction = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Skip empty lines or header lines
    if (
      !trimmedLine ||
      trimmedLine.toLowerCase().startsWith("date") ||
      trimmedLine.toLowerCase().startsWith("description") ||
      trimmedLine.toLowerCase().startsWith("amount")
    )
      continue;

    const hasDate = dateRegex.test(trimmedLine);

    if (hasDate) {
      // If a new transaction starts, push the previous one if it exists
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      let date = trimmedLine.match(dateRegex)[0]; // Extract date
      let restOfLine = trimmedLine.replace(dateRegex, "").trim(); // Get remaining part of line
      let amountMatch = restOfLine.match(amountRegex); // Try to find amount

      let description = restOfLine;
      let amount = null;

      if (amountMatch) {
        amount = (amountMatch[1] || "") + amountMatch[2].replace(/,/g, ""); // Extract and clean amount
        description = description.replace(amountMatch[0], "").trim(); // Remove amount from description
      }

      currentTransaction = { date, description, amount }; // Start new transaction
    } else if (currentTransaction && !currentTransaction.amount) {
      // If no amount found on date line, check subsequent lines for amount or description continuation
      let amountMatch = trimmedLine.match(amountRegex);
      let descriptionPart = trimmedLine;

      if (amountMatch) {
        currentTransaction.amount =
          (amountMatch[1] || "") + amountMatch[2].replace(/,/g, "");
        descriptionPart = descriptionPart.replace(amountMatch[0], "").trim();
      }
      currentTransaction.description += " " + descriptionPart; // Append to description
    } else if (currentTransaction && currentTransaction.amount) {
      // If a transaction is complete (has date and amount), append subsequent lines to the description of the *last* transaction if it makes sense.
      // This is a common pattern for multi-line descriptions where the amount is on the first line.
      const lastTx = transactions[transactions.length - 1];
      if (lastTx) {
        lastTx.Description += " " + trimmedLine;
      } else {
        // Fallback: If for some reason lastTx is null (shouldn't happen with correct logic flow),
        // and currentTransaction is complete, push it.
        if (currentTransaction) {
          transactions.push(currentTransaction);
          currentTransaction = null; // Reset to avoid double-pushing
        }
      }
    }
  }

  // Push the last transaction if it exists
  if (currentTransaction) {
    transactions.push(currentTransaction);
  }

  // Format and clean final transactions for CSV export
  return transactions.map((t) => {
    // Convert date to DD/MM/YY format
    const dateObj = new Date(t.date);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedDate = `${day}/${month}/${String(year).slice(-2)}`;

    // Clean and normalize description
    const cleanedDescription = t.description.replace(/\s+/g, " ").trim();

    // Handle descriptions that might be unintentionally wrapped in quotes from PDF extraction
    const finalDescriptionUnescaped =
      cleanedDescription.startsWith('"') && cleanedDescription.endsWith('"')
        ? cleanedDescription.substring(1, cleanedDescription.length - 1)
        : cleanedDescription;

    // CSV escape description
    const descForCsv =
      finalDescriptionUnescaped.includes(",") ||
      finalDescriptionUnescaped.includes('"') ||
      finalDescriptionUnescaped.includes("\n")
        ? `"${finalDescriptionUnescaped.replace(/"/g, '""')}"`
        : finalDescriptionUnescaped;

    return {
      Date: formattedDate,
      Description: descForCsv,
      Amount: parseFloat(t.amount).toFixed(2), // Format amount to 2 decimal places
    };
  });
}

/**
 * Processes a bank statement PDF using the Gemini AI API to extract transactions.
 * It sends each page's text content to the AI and aggregates the results.
 * @param {Object} pdf - The PDFDocumentProxy object from pdf.js.
 * @param {string} apiKey - The Gemini API key.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of extracted transaction objects.
 */
async function processGeminiStatementWithAI(pdf, apiKey) {
  const allExtractedTransactions = [];
  const totalPages = pdf.numPages;

  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please provide it.");
  }

  for (let i = 1; i <= totalPages; i++) {
    statusText.textContent = `Sending page ${i}/${totalPages} to AI for processing...`;
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" "); // Concatenate all text from the page

    // Add this line to log the raw text content of each page
    console.log(`Raw text content from page ${i}:`, pageText);

    let chatHistory = [];
    const prompt = `You are an expert at extracting financial transactions from bank statements.
      Extract all transactions from the following page text.
      For each transaction, identify the 'Date', 'Description', and 'Amount'.
      
      Rules for extraction:
      - The Date should be in DD/MM/YYYY format. If only DD/MM is present, assume the current year for a full DD/MM/YY format before outputting as DD/MM/YY.
      - The Description should be a concise summary of the transaction.
      - The Amount should be a numeric value. It should be positive for incoming funds (credit) and negative for outgoing funds (debit/expense). Do not include currency symbols (like RM).
      - Pay close attention to keywords and common transaction patterns to correctly identify whether an amount is a debit or a credit. For example, 'DUITNOW QR' or direct deposits are typically positive, while 'QR PAY SALES', 'MBB CT', or mentions of purchases/payments are typically negative. If the original text explicitly shows a minus sign or indicates a debit, ensure the output amount is negative.
      - Ignore any opening/closing balances, totals, page numbers, headers, footers, or non-transactional text.
      - If multiple transactions are found, return them as an array of objects.
      - If no transactions are found on this page, return an empty array.

      Here is the bank statement page text:
      """
      ${pageText}
      """
      `;

    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              Date: {
                type: "STRING",
                description: "Transaction date in DD/MM/YYYY format.",
              },
              Description: {
                type: "STRING",
                description: "Concise description of the transaction.",
              },
              Amount: {
                type: "NUMBER",
                description:
                  "Numeric amount, positive for credit, negative for debit.",
              },
            },
            required: ["Date", "Description", "Amount"],
          },
        },
      },
    };

    // Construct API URL for Gemini Flash model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API request failed for page ${i}: ${response.status} ${response.statusText}. Details: ${errorBody}`
        );
      }

      const result = await response.json();

      // Check if the API response contains valid candidates and content
      if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const jsonString = result.candidates[0].content.parts[0].text;
        let parsedTransactions;
        try {
          parsedTransactions = JSON.parse(jsonString); // Parse the JSON response
        } catch (parseError) {
          console.warn(`Could not parse JSON for page ${i}:`, parseError);
          // If JSON parsing fails, skip this page's results but don't stop process
          continue;
        }

        // Format extracted transactions (e.g., ensure correct date year, clean description, fix amount)
        const formattedTransactions = parsedTransactions.map((t) => {
          let [day, month, year] = t.Date.split("/");
          if (!year || year.length !== 4) {
            const currentYear = new Date().getFullYear();
            const currentYY = String(currentYear).slice(-2);
            const parsedYY = parseInt(year, 10);
            year =
              parsedYY <= parseInt(currentYY, 10)
                ? `20${String(parsedYY).padStart(2, "0")}`
                : `19${String(parsedYY).padStart(2, "0")}`;
          }
          const formattedYear = String(year).slice(-2); // Use 2-digit year for final output

          const cleanedDescription = String(t.Description)
            .replace(/\s+/g, " ")
            .trim();
          // CSV escape description
          const descForCsv =
            cleanedDescription.includes(",") ||
            cleanedDescription.includes('"') ||
            cleanedDescription.includes("\n")
              ? `"${cleanedDescription.replace(/"/g, '""')}"`
              : cleanedDescription;

          return {
            Date: `${String(day).padStart(2, "0")}/${String(month).padStart(
              2,
              "0"
            )}/${formattedYear}`,
            Description: descForCsv,
            Amount: parseFloat(t.Amount).toFixed(2), // Format amount
          };
        });
        allExtractedTransactions.push(...formattedTransactions); // Add to overall transactions
      } else {
        // Handle cases where API response is valid but contains no content or is blocked
        let feedbackMessage = `No valid content found for page ${i} in Gemini API response.`;
        if (result.promptFeedback && result.promptFeedback.blockReason) {
          feedbackMessage += ` Block reason: ${result.promptFeedback.blockReason}.`;
          if (result.promptFeedback.safetyRatings) {
            feedbackMessage += ` Safety ratings: ${JSON.stringify(
              result.promptFeedback.safetyRatings
            )}.`;
          }
        }
        showMessage(
          "error",
          `AI processing warning for page ${i}: ${feedbackMessage}`
        );
      }
    } catch (error) {
      showMessage(
        "error",
        `AI processing failed for page ${i}: ${error.message}.`
      );
      console.error(`AI processing error for page ${i}:`, error);
    }
  }
  return allExtractedTransactions;
}

// --- 6. Initialization (DOMContentLoaded) ---

document.addEventListener("DOMContentLoaded", () => {
  // Apply theme based on user's system preference initially
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(prefersDarkMode.matches);

  // Listen for changes in system theme preference
  prefersDarkMode.addEventListener("change", (e) => {
    applyTheme(e.matches);
  });

  // Initial UI reset
  resetUI();
  updateDownloadButtonState(); // Ensure download button is disabled on load

  // Event Listeners for UI interactions
  parserSelect.addEventListener("change", resetUI); // Reset UI when parser changes
  fileInput.addEventListener("change", (event) => {
    handleFiles(event.target.files); // Handle file selection
  });
  removeAllFilesBtn.addEventListener("click", resetUI); // Clear all files

  // Drag and drop event listeners for the upload area
  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault(); // Prevent default to allow drop
    uploadArea.classList.add(
      "border-accent-blue-light",
      "bg-blue-50",
      "dark:border-accent-blue-dark",
      "dark:bg-gray-700"
    );
  });
  uploadArea.addEventListener("dragleave", () => {
    // Remove highlight on drag leave
    uploadArea.classList.remove(
      "border-accent-blue-light",
      "bg-blue-50",
      "dark:border-accent-blue-dark",
      "dark:bg-gray-700"
    );
  });
  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault(); // Prevent default browser behavior (opening file)
    uploadArea.classList.remove(
      "border-accent-blue-light",
      "bg-blue-50",
      "dark:border-accent-blue-dark",
      "dark:bg-gray-700"
    );
    handleFiles(event.dataTransfer.files); // Handle dropped files
  });

  // Process and Download buttons
  processBtn.addEventListener("click", processStatements);
  downloadBtn.addEventListener("click", () => {
    downloadCSV(allTransactions); // Download current transactions
  });
});
