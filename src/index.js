import {
  getGeminiApiKey,
  showApiKeyModal,
  showMessage,
  hideMessage,
  parseDateForSorting,
  downloadCSV,
  getPDFLib,
  removeElementAtIndex,
  filterPdfFiles,
} from "./utils.js";

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
const spinnerProcess = document.getElementById("spinner-process");
const resultsContainer = document.getElementById("results-container");
const resultsTableBody = document.getElementById("results-table-body");

let selectedFiles = [];
let allTransactions = [];

function resetUI() {
  selectedFiles = [];
  allTransactions = [];
  fileInput.value = "";
  fileInfo.classList.add("hidden");
  uploadLabel.classList.remove("hidden");
  processBtn.disabled = true;
  statusText.textContent = "";
  hideMessage();
  updateStatementsFileDisplay();
  processBtnText.textContent = "Process";
  spinnerProcess.classList.add("hidden");
  displayTransactions([]);
  updateStatementsButtonsState();
}

function updateStatementsFileDisplay() {
  filePillsContainer.innerHTML = "";
  if (selectedFiles.length === 0) {
    fileInfo.classList.add("hidden");
    uploadLabel.classList.remove("hidden");
  } else {
    selectedFiles.forEach((file, index) => {
      const pill = document.createElement("span");
      pill.className = "badge badge-md badge-info mr-2 mb-2";
      pill.innerHTML = `
        ${file.name}
        <button type="button" class="ml-2" data-index="${index}">
          <svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
          </svg>
        </button>
      `;
      pill.querySelector("button").addEventListener("click", (event) => {
        const fileIndexToRemove = parseInt(event.currentTarget.dataset.index);
        removeIndividualFile(fileIndexToRemove);
      });
      filePillsContainer.appendChild(pill);
    });
    fileInfo.classList.remove("hidden");
    uploadLabel.classList.add("hidden");
  }
  processBtn.disabled = selectedFiles.length === 0;
}

function displayTransactions(data) {
  resultsTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    const noResultsRow = document.createElement("tr");
    noResultsRow.innerHTML = `
      <td colspan="3" class="text-center">
        No documents processed yet.
      </td>
    `;
    resultsTableBody.appendChild(noResultsRow);
    return;
  }

  try {
    data.forEach((row) => {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = row.Date || "";
      tr.appendChild(tdDate);

      const tdDescription = document.createElement("td");
      tdDescription.textContent = row.Description || "";
      tr.appendChild(tdDescription);

      const tdAmount = document.createElement("td");
      const value = row.Amount || "";
      tdAmount.textContent = value;
      if (typeof value === "string" && value.trim() !== "") {
        const amount = parseFloat(value);
        tdAmount.classList.add("text-right", "font-mono");
        tdAmount.classList.toggle("text-success", amount > 0);
        tdAmount.classList.toggle("text-error", amount < 0);
      }
      tr.appendChild(tdAmount);
      resultsTableBody.appendChild(tr);
    });
  } catch (e) {
    showMessage(
      "error",
      "Could not display results due to an internal error. Check the console."
    );
  }
}

function updateStatementsButtonsState() {
  const hasResults =
    resultsTableBody.children.length > 0 &&
    resultsTableBody.children[0].textContent.trim() !==
      "No documents processed yet.";

  downloadBtn.disabled = !hasResults;
}

function handleFiles(files) {
  const pdfFiles = filterPdfFiles(files);

  if (pdfFiles.length === 0) {
    showMessage("error", "Please select valid PDF file(s).");
    if (selectedFiles.length === 0) {
      processBtn.disabled = true;
    }
    return;
  }

  pdfFiles.forEach((newFile) => {
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

  updateStatementsFileDisplay();
  processBtn.disabled = selectedFiles.length === 0;
  hideMessage();
}

function removeIndividualFile(indexToRemove) {
  selectedFiles = removeElementAtIndex(selectedFiles, indexToRemove);
  updateStatementsFileDisplay();
  if (selectedFiles.length === 0) {
    hideMessage();
  }
}

async function processStatements() {
  let filesToProcess = [...selectedFiles];

  if (filesToProcess.length === 0) {
    showMessage("error", "Please select at least one PDF file first.");
    return;
  }

  processBtn.disabled = true;
  spinnerProcess.classList.remove("hidden");
  processBtnText.textContent = "Processing";
  statusText.textContent = "";
  hideMessage();

  allTransactions = [];

  let currentGeminiApiKey = getGeminiApiKey();

  if (parserSelect.value === "gemini-parser" && !currentGeminiApiKey) {
    try {
      const key = await showApiKeyModal();
      if (!key) {
        showMessage(
          "error",
          "Gemini API key is required for this parser. Processing canceled."
        );
        processBtn.disabled = false;
        spinnerProcess.classList.add("hidden");
        processBtnText.textContent = "Process";
        return;
      }
      currentGeminiApiKey = key;
    } catch (error) {
      showMessage(
        "error",
        "Could not get Gemini API key. Processing canceled."
      );
      processBtn.disabled = false;
      spinnerProcess.classList.add("hidden");
      processBtnText.textContent = "Process";
      return;
    }
  }

  try {
    const pdfjsLib = await getPDFLib();

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      statusText.textContent = `Processing ${file.name} (${i + 1}/${
        filesToProcess.length
      })...`;

      const fileReader = new FileReader();
      const fileReadPromise = new Promise((resolve, reject) => {
        fileReader.onload = (e) => resolve(e.target.result);
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
      });

      const typedarray = new Uint8Array(await fileReadPromise);
      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let fileTransactions = [];

      switch (parserSelect.value) {
        case "maybank-pdf":
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
            currentGeminiApiKey
          );
          break;
        default:
          showMessage(
            "error",
            "Invalid parser selected. Please choose a valid statement type."
          );
          throw new Error("Invalid parser selected.");
      }
      allTransactions = allTransactions.concat(fileTransactions);
    }

    allTransactions.sort((a, b) => {
      const dateA = parseDateForSorting(a["Date"]);
      const dateB = parseDateForSorting(b["Date"]);
      return dateA - dateB;
    });

    statusText.textContent = "";
    displayTransactions(allTransactions);
    updateStatementsButtonsState();

    if (allTransactions.length > 0) {
      showMessage(
        "success",
        `${filesToProcess.length} PDF(s) processed and converted file ready for download!`
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
  } finally {
    processBtn.disabled = false;
    spinnerProcess.classList.add("hidden");
    processBtnText.textContent = "Process";
    statusText.textContent = "Processing your statements...";
  }
}

async function extractTextLinesFromPdfMaybankPdf(pdf) {
  const allLines = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lines = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push(item);
    }
    const sortedY = Object.keys(lines).sort((a, b) => b - a);
    for (const y of sortedY) {
      lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
      allLines.push(lines[y].map((item) => item.str).join(" "));
    }
  }
  return allLines;
}

function parseTransactionsMaybankPdf(allLinesFromPdf) {
  const statementDateMatch = allLinesFromPdf
    .join(" ")
    .match(/STATEMENT DATE\s*:\s*(\d{2}\/\d{2}\/\d{2})/i);
  const year = statementDateMatch
    ? `20${statementDateMatch[1].slice(-2)}`
    : new Date().getFullYear().toString();

  const filteredLines = [];
  let inTransactionBlock = false;

  for (const line of allLinesFromPdf) {
    if (/ACCOUNT\s*TRANSACTIONS/i.test(line)) {
      inTransactionBlock = true;
      continue;
    }
    if (/BAKI\s*LEGAR/i.test(line)) {
      inTransactionBlock = false;
      continue;
    }
    if (inTransactionBlock) {
      if (/TARIKH\s*MASUK/i.test(line) && /TARIKH\s*NILAI/i.test(line))
        continue;
      if (/進支日期/i.test(line) && /仄過賬日期/.test(line)) continue;
      if (/ENTRY\s*DATE/i.test(line) && /VALUE\s*DATE/i.test(line)) continue;
      if (/BEGINNING\s*BALANCE/i.test(line)) continue;
      if (line.trim() === "=") continue;
      filteredLines.push(line);
    }
  }

  const transactions = [];
  let descriptionParts = [];

  for (const line of [...filteredLines].reverse()) {
    const isIgnoreLine =
      /TIADA\s*URUSNIAGA/i.test(line) ||
      /NO\s*TRANSACTION/i.test(line) ||
      /TOTAL\s*DEBIT/i.test(line) ||
      /ENDING\s*BALANCE/i.test(line) ||
      /LEDGER\s*BALANCE/i.test(line);

    if (isIgnoreLine) {
      descriptionParts = [];
      continue;
    }

    const txMatch = line.match(
      /^\s*(\d{2}\/\d{2})\s+(.*?)\s+([\d,]*\.\d{1,2}[+-])(?:\s+[\d,]*\.\d{2})?$/
    );

    if (txMatch) {
      let date = txMatch[1];
      let description = txMatch[2];
      const amountWithSign = txMatch[3];

      const amountStr = amountWithSign.replace(/,/g, "").replace(/[+-]$/, "");
      const sign = amountWithSign.slice(-1);
      let amount = parseFloat(amountStr);
      if (sign === "-") amount = -amount;

      if (date === undefined && descriptionParts.length > 0) {
        const dateInDescIndex = descriptionParts.findIndex((p) =>
          /^\d{2}\/\d{2}/.test(p.trim())
        );
        if (dateInDescIndex > -1) {
          const lineWithDate = descriptionParts.splice(dateInDescIndex, 1)[0];
          date = lineWithDate.trim().substring(0, 5);
          description =
            lineWithDate.trim().substring(5).trim() + " " + description;
        }
      }

      if (descriptionParts.length > 0) {
        description =
          description.trim() + " " + descriptionParts.reverse().join(" ");
      }

      if (date) {
        transactions.push({
          Date: `${date}/${year}`,
          Description: description,
          Amount: amount,
        });
      }
      descriptionParts = [];
    } else {
      if (line.trim().length > 1) {
        descriptionParts.push(line.trim());
      }
    }
  }

  const finalTransactions = transactions.reverse().map((t) => {
    const cleanedDesc = String(t.Description)
      .replace(/TRANSFER FR A\/C/gi, "")
      .replace(/TRANSFER TO A\/C/gi, "")
      .replace(/PAYMENT FR A\/C/gi, "")
      .replace(/MBB CT-?/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    return {
      Date: t.Date,
      Description: cleanedDesc,
      Amount: parseFloat(t.Amount).toFixed(2),
    };
  });
  return finalTransactions;
}

async function getHighAccuracyTextFromPdfMaybankWeb(pdf) {
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    let lastY = -1;
    let lineText = "";

    textContent.items.sort((a, b) => {
      if (a.transform[5] < b.transform[5]) return 1;
      if (a.transform[5] > b.transform[5]) return -1;
      if (a.transform[4] < b.transform[4]) return -1;
      if (a.transform[4] > b.transform[4]) return 1;
      return 0;
    });

    for (const item of textContent.items) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        fullText += lineText.trim() + "\n";
        lineText = "";
      }
      lineText += item.str + " ";
      lastY = item.transform[5];
    }
    fullText += lineText.trim() + "\n";
  }
  return fullText;
}

function parseTextAndGenerateCsvMaybankWeb(text) {
  const transactions = [];
  const dateRegex = /^\d{1,2}\s+\w{3}\s+\d{4}/;
  const amountRegex = /(-?)\s*RM\s*([\d,]+\.\d{2})\s*$/;

  const lines = text.split("\n");
  let currentTransaction = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (
      !trimmedLine ||
      trimmedLine.toLowerCase().startsWith("date") ||
      trimmedLine.toLowerCase().startsWith("description") ||
      trimmedLine.toLowerCase().startsWith("amount")
    )
      continue;

    const hasDate = dateRegex.test(trimmedLine);

    if (hasDate) {
      if (currentTransaction) {
        transactions.push(currentTransaction);
      }

      let date = trimmedLine.match(dateRegex)[0];
      let restOfLine = trimmedLine.replace(dateRegex, "").trim();
      let amountMatch = restOfLine.match(amountRegex);

      let description = restOfLine;
      let amount = null;

      if (amountMatch) {
        amount = (amountMatch[1] || "") + amountMatch[2].replace(/,/g, "");
        description = description.replace(amountMatch[0], "").trim();
      }

      currentTransaction = { date, description, amount };
    } else if (currentTransaction && !currentTransaction.amount) {
      let amountMatch = trimmedLine.match(amountRegex);
      let descriptionPart = trimmedLine;

      if (amountMatch) {
        currentTransaction.amount =
          (amountMatch[1] || "") + amountMatch[2].replace(/,/g, "");
        descriptionPart = descriptionPart.replace(amountMatch[0], "").trim();
      }
      currentTransaction.description += " " + descriptionPart;
    } else if (currentTransaction && currentTransaction.amount) {
      const lastTx = transactions[transactions.length - 1];
      if (lastTx) {
        lastTx.Description += " " + trimmedLine;
      } else {
        if (currentTransaction) {
          transactions.push(currentTransaction);
          currentTransaction = null;
        }
      }
    }
  }

  if (currentTransaction) {
    transactions.push(currentTransaction);
  }

  return transactions.map((t) => {
    const dateObj = new Date(t.date);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    const cleanedDescription = String(t.description)
      .replace(/\s+/g, " ")
      .trim();

    const finalDescriptionUnescaped =
      cleanedDescription.startsWith('"') && cleanedDescription.endsWith('"')
        ? cleanedDescription.substring(1, cleanedDescription.length - 1)
        : cleanedDescription;

    return {
      Date: formattedDate,
      Description: finalDescriptionUnescaped,
      Amount: parseFloat(t.amount).toFixed(2),
    };
  });
}

async function processGeminiStatementWithAI(pdf, apiKey) {
  const allExtractedTransactions = [];
  const totalPages = pdf.numPages;

  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please provide it.");
  }

  for (let i = 1; i <= totalPages; i++) {
    statusText.textContent = `Processing page ${i}/${totalPages} using AI...`;
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");

    let chatHistory = [];
    const prompt = `You are an expert at extracting financial transactions from bank statements.
      Extract all transactions from the following page text.
      For each transaction, identify the 'Date', 'Description', and 'Amount'.

      Rules for extraction:
      - The Date should be in DD/MM/YYYY format. If only DD/MM is present, assume the current year for a full DD/MM/YYYY format.
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
          parsedTransactions = JSON.parse(jsonString);
        } catch (parseError) {
          showMessage(
            "error",
            `AI response for page ${i} could not be parsed. Skipping this page.`
          );
          continue;
        }

        const formattedTransactions = parsedTransactions.map((t) => {
          let [day, month, year] = t.Date.split("/");
          const currentYearFull = new Date().getFullYear();
          const currentYY = String(currentYearFull).slice(-2);
          const parsedYY = parseInt(year, 10);
          const century =
            parsedYY <= parseInt(currentYY, 10) + 50 ? "20" : "19";

          const formattedYear =
            year.length === 4
              ? year
              : `${century}${String(parsedYY).padStart(2, "0")}`;

          const cleanedDescription = String(t.Description)
            .replace(/\s+/g, " ")
            .trim();

          return {
            Date: `${String(day).padStart(2, "0")}/${String(month).padStart(
              2,
              "0"
            )}/${formattedYear}`,
            Description: cleanedDescription,
            Amount: parseFloat(t.Amount).toFixed(2),
          };
        });
        allExtractedTransactions.push(...formattedTransactions);
      } else {
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
    }
  }
  return allExtractedTransactions;
}

document.addEventListener("DOMContentLoaded", () => {
  resetUI();
  updateStatementsButtonsState();

  parserSelect.addEventListener("change", () => {
    displayTransactions([]);
    updateStatementsButtonsState();
    hideMessage();
    statusText.textContent = "";
    processBtn.disabled = selectedFiles.length === 0;
  });

  fileInput.addEventListener("change", (event) => {
    handleFiles(event.target.files);
  });
  removeAllFilesBtn.addEventListener("click", resetUI);

  uploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    uploadArea.classList.add("upload-area-highlight");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("upload-area-highlight");
  });
  uploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    uploadArea.classList.remove("upload-area-highlight");
    handleFiles(event.dataTransfer.files);
  });

  processBtn.addEventListener("click", processStatements);
  downloadBtn.addEventListener("click", () => {
    const headers = ["Date", "Description", "Amount"];
    downloadCSV(allTransactions, headers, "transactions.csv");
  });
});
