import {
  getGeminiApiKey,
  showApiKeyModal,
  showConfirmationModal,
  hideConfirmationModal,
  downloadCSV,
  formatAmountForDisplay,
  formatDateForDisplay,
  FileListShim,
  showMessage,
  hideMessage,
  getPDFLib,
  removeElementAtIndex,
} from "./utils.js";

let uploadedFiles = [];
let currentPdfTextForAnalysis = "";
let activeConfig = null;
let localConfigurations = [];
let allExtractedData = [];
let currentRegexTargetField = null;

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const DEBUG_MODE = false;

const fileInput = document.getElementById("file-input");
const pdfRawTextPreview = document.getElementById("pdfRawTextPreview");
const processBtn = document.getElementById("process-btn");
const processBtnText = document.getElementById("process-btn-text");
const spinnerProcess = document.getElementById("spinner-process");
const supplierNameSpan = document.getElementById("supplierName");
const documentDateSpan = document.getElementById("documentDate");
const documentNumberSpan = document.getElementById("documentNumber");
const totalAmountSpan = document.getElementById("totalAmount");
const configNameInput = document.getElementById("configName");
const officialSupplierNameForExportInput = document.getElementById(
  "officialSupplierNameForExportInput"
);
const supplierNameRegexInput = document.getElementById("supplierNameRegex");
const documentDateRegexInput = document.getElementById("documentDateRegex");
const documentNumberRegexInput = document.getElementById("documentNumberRegex");
const totalAmountRegexInput = document.getElementById("totalAmountRegex");
const configSelect = document.getElementById("configSelect");
const previewButton = document.getElementById("previewButton");
const previewBtnText = document.getElementById("preview-btn-text");
const spinnerPreview = document.getElementById("spinner-preview");
const uploadArea = document.getElementById("upload-area");
const filePillsContainer = document.getElementById("file-pills-container");
const resultsContainer = document.getElementById("results-container");
const resultsTableBody = document.getElementById("results-table-body");
const downloadBtn = document.getElementById("download-btn");
const removeAllFilesBtn = document.getElementById("remove-all-files-btn");
const currentAnalysisFileName = document.getElementById(
  "currentAnalysisFileName"
);
const tabButtonProcess = document.getElementById("tabButtonProcess");
const tabButtonTemplate = document.getElementById("tabButtonTemplate");
const tabContentProcess = document.getElementById("tabContentProcess");
const tabContentTemplate = document.getElementById("tabContentTemplate");
const aiSuggestDateBtn = document.getElementById("aiSuggestDateBtn");
const aiSuggestNumberBtn = document.getElementById("aiSuggestNumberBtn");
const aiSuggestAmountBtn = document.getElementById("aiSuggestAmountBtn");

const confirmationModal = document.getElementById("confirmationModal");
const confirmationModalTitle = document.getElementById(
  "confirmationModalTitle"
);
const confirmationModalText = document.getElementById("confirmationModalText");
const confirmActionButton = document.getElementById("confirmActionButton");
const cancelConfirmationButton = document.getElementById(
  "cancelConfirmationButton"
);

const regexSuggestModal = document.getElementById("regexSuggestModal");
const regexSuggestModalTitle = document.getElementById(
  "regexSuggestModalTitle"
);
const regexUserPrompt = document.getElementById("regexUserPrompt");
const generateRegexButton = document.getElementById("generateRegexButton");
const regexSuggestionsContainer = document.getElementById(
  "regexSuggestionsContainer"
);
const noSuggestionsText = document.getElementById("noSuggestionsText");
const regexSuggestStatus = document.getElementById("regexSuggestStatus");
const cancelRegexSuggestButton = document.getElementById(
  "cancelRegexSuggestButton"
);
const useSelectedRegexButton = document.getElementById(
  "useSelectedRegexButton"
);
const regexTestResult = document.getElementById("regexTestResult");

const saveTemplateButton = document.getElementById("saveTemplateButton");
const deleteTemplateButton = document.getElementById("deleteTemplateButton");
const importConfigButton = document.getElementById("importConfigButton");
const exportAllConfigsButton = document.getElementById(
  "exportAllConfigsButton"
);

const uploadLabel = document.getElementById("upload-label");
const fileInfo = document.getElementById("file-info");

function logDebug(message) {
  if (DEBUG_MODE) {
  }
}

function showNoDocumentSelectedModal() {
  showMessage(
    "info",
    "Please select a document from the 'Extract' tab first to proceed."
  );
}

async function showRegexSuggestModal(fieldName) {
  if (!currentPdfTextForAnalysis) {
    showNoDocumentSelectedModal();
    return;
  }

  if (!getGeminiApiKey()) {
    const key = await showApiKeyModal();
    if (!key) {
      showMessage(
        "error",
        "Gemini API key is required for AI-powered features. Operation canceled."
      );
      return;
    }
  }

  currentRegexTargetField = fieldName;
  regexSuggestModalTitle.textContent = `AI Regex Suggestions for ${fieldName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .replace("document ", "")}`;

  regexUserPrompt.value = "";
  regexSuggestionsContainer.innerHTML =
    '<p id="noSuggestionsText" class="text-sm p-secondary">Click "Generate Suggestions" to get AI help.</p>';
  useSelectedRegexButton.disabled = true;
  regexSuggestStatus.textContent = "";
  regexTestResult.textContent = "Test Result: No regex tested yet.";

  regexSuggestModal.showModal();
}

function hideRegexSuggestModal() {
  regexSuggestModal.close();
  currentRegexTargetField = null;
}

function testRegexInModal(regexPattern) {
  if (!currentPdfTextForAnalysis) {
    regexTestResult.textContent =
      "Test Result: Error - No PDF text loaded for analysis.";
    regexTestResult.classList.add("text-red-500");
    return;
  }

  regexTestResult.classList.remove("text-red-500", "text-green-500");

  try {
    const regex = new RegExp(regexPattern, "i");
    const match = currentPdfTextForAnalysis.match(regex);

    if (match) {
      const result = match[1] ? match[1].trim() : match[0].trim();
      let cleanedResult = result;
      if (currentRegexTargetField === "documentNumber") {
        cleanedResult = result
          .replace(/\s*-\s*/g, "-")
          .replace(/\s+/g, "")
          .trim();
      }
      regexTestResult.textContent = `Test Result: Match Found -> "${cleanedResult}"`;
      regexTestResult.classList.add("text-green-500");
    } else {
      regexTestResult.textContent = "Test Result: No match found.";
      regexTestResult.classList.add("text-red-500");
    }
  } catch (e) {
    regexTestResult.textContent = `Test Result: Invalid regex pattern -> ${e.message}`;
    regexTestResult.classList.add("text-red-500");
  }
}

function useSelectedRegex() {
  const selectedRadio = regexSuggestionsContainer.querySelector(
    'input[name="regexSuggestion"]:checked'
  );
  if (selectedRadio) {
    const selectedRegex = decodeURIComponent(selectedRadio.value);
    if (currentRegexTargetField === "documentDate") {
      documentDateRegexInput.value = selectedRegex;
    } else if (currentRegexTargetField === "documentNumber") {
      documentNumberRegexInput.value = selectedRegex;
    } else if (currentRegexTargetField === "totalAmount") {
      totalAmountRegexInput.value = selectedRegex;
    }
    hideRegexSuggestModal();
    previewButton.click();
  } else {
    showMessage("info", "Please select a regex suggestion first.");
  }
}

async function callGeminiApi(
  pdfText,
  config = null,
  isRefine = false,
  classifyOnly = false,
  useLlmsForOperation = true,
  generateRegexForField = null,
  userContextForRegex = null
) {
  let currentGeminiApiKey = getGeminiApiKey();

  if (useLlmsForOperation && !currentGeminiApiKey) {
    try {
      const key = await showApiKeyModal();
      if (!key) {
        showMessage(
          "error",
          "Gemini API key is required for AI-powered features. Operation canceled."
        );
        return null;
      }
      currentGeminiApiKey = key;
    } catch (error) {
      showMessage("error", "Could not get Gemini API key. Operation canceled.");
      return null;
    }
  }

  processBtn.disabled = true;
  previewButton.disabled = true;
  saveTemplateButton.disabled = true;
  deleteTemplateButton.disabled = true;
  importConfigButton.disabled = true;
  exportAllConfigsButton.disabled = true;

  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = true;
  });
  useSelectedRegexButton.disabled = true;

  let prompt;
  let responseMimeType = "application/json";
  let normalizedResult = {};

  if (classifyOnly && localConfigurations.length > 0) {
    normalizedResult = classifyDocumentHeuristically(
      pdfText,
      localConfigurations
    );
    return normalizedResult;
  } else if (generateRegexForField) {
    regexSuggestStatus.textContent = "Generating suggestions...";
    let regexPrompt = `From the following document text, suggest 3-5 JavaScript-compatible regular expressions (regex) to extract the "${generateRegexForField}" field. Provide only the regex patterns, in a JSON array format like {"regexSuggestions": ["regex1", "regex2", "regex3"]}. The regex should include a capturing group for the value if applicable, and be suitable for use with JavaScript's String.prototype.match() method.`;
    if (userContextForRegex) {
      regexPrompt += `\n\nAdditional context from user: "${userContextForRegex}"`;
    }
    prompt = `${regexPrompt}\nDocument Text: "${pdfText.substring(
      0,
      Math.min(pdfText.length, 1500)
    )}"`;
    responseMimeType = "application/json";
  } else if (!useLlmsForOperation) {
    normalizedResult = extractDataWithRegex(pdfText, config);
    return normalizedResult;
  } else {
    prompt = `Extract the following information from the invoice/receipt text:\n`;
    prompt += `- Supplier Name\n- Document Date\n- Document Number\n- Total Amount\n\n`;
    prompt += `Return the results in a JSON object with keys: "supplierName", "documentDate", "documentNumber", "totalAmount".\n`;
    prompt += `If a value is not found, return null for that key. Ensure Total Amount is a number (e.g., 123.45). Date should be in DD/MM/YYYY format.\n\n`;

    if (config) {
      prompt += `Here are some extraction guidelines. For each field, **strictly attempt to extract using the provided pattern first.** If the pattern does not yield a result, or if no pattern is provided, then use general knowledge to find the best match:\n`;
      if (config.supplierNamePattern)
        prompt += `- Supplier Name Regex: "${config.supplierNamePattern}"\n`;
      if (config.documentDatePattern)
        prompt += `- Document Date Regex: "${config.documentDatePattern}"\n`;
      if (config.documentNumberPattern)
        prompt += `- Document Number Regex: "${config.documentNumberPattern}"\n`;
      if (config.totalAmountPattern)
        prompt += `- Total Amount Regex: "${config.totalAmountPattern}"\n`;
      prompt += "\n";
    }
    prompt += `Invoice/Receipt Text:\n\n${pdfText}\n\nJSON Output:`;
  }

  try {
    const response = await fetch(
      `${GEMINI_API_ENDPOINT}?key=${currentGeminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: responseMimeType,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API call failed: ${errorData.error.message || response.statusText}`
      );
    }

    const data = await response.json();
    if (
      !data.candidates ||
      !data.candidates.length ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts.length ||
      !data.candidates[0].content.parts[0].text
    ) {
      throw new Error("Invalid response format from Gemini API.");
    }

    const rawResult = JSON.parse(data.candidates[0].content.parts[0].text);

    if (generateRegexForField) {
      if (rawResult && Array.isArray(rawResult.regexSuggestions)) {
        regexSuggestStatus.textContent =
          "Suggestions generated. Select one to use.";
        return rawResult.regexSuggestions;
      }
      regexSuggestStatus.textContent =
        "No regex suggestions could be generated.";
      return [];
    } else {
      if (Array.isArray(rawResult) && rawResult.length > 0) {
        normalizedResult = rawResult[0];
      } else if (typeof rawResult === "object" && rawResult !== null) {
        normalizedResult = rawResult;
      }
      return normalizedResult;
    }
  } catch (error) {
    showMessage("error", `AI operation failed: ${error.message}`);
    regexSuggestStatus.textContent = `Error: ${error.message}`;
    throw error;
  } finally {
    updateTemplateButtonsState();
    updateProcessButtonsState();
  }
}

function extractDataWithRegex(pdfText, config) {
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

function classifyDocumentHeuristically(pdfText, configurations) {
  let scores = [];

  const testPattern = (text, pattern) => {
    if (!pattern) return false;
    try {
      return new RegExp(pattern, "i").test(text);
    } catch (e) {
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

  if (bestMatch.score >= 3) {
    return { matchedConfigName: bestMatch.configName };
  } else {
    return { matchedConfigName: "None" };
  }
}

async function generateRegexSuggestions() {
  if (generateRegexButton.disabled) {
    console.log(
      "generateRegexSuggestions: Button is already disabled, skipping this call."
    );
    return;
  }

  generateRegexButton.disabled = true;
  useSelectedRegexButton.disabled = true;

  if (!currentPdfTextForAnalysis) {
    showMessage(
      "info",
      "A PDF must be loaded for analysis to generate regex suggestions."
    );
    generateRegexButton.disabled = false;
    updateTemplateButtonsState();
    return;
  }

  if (!getGeminiApiKey()) {
    await showApiKeyModal();
    if (!getGeminiApiKey()) {
      showMessage(
        "error",
        "Gemini API key is required for AI-powered features. Operation canceled."
      );
      generateRegexButton.disabled = false;
      updateTemplateButtonsState();
      return;
    }
  }

  const userPrompt = regexUserPrompt.value.trim();
  regexSuggestStatus.textContent = "Generating suggestions...";
  regexSuggestionsContainer.innerHTML =
    '<p class="text-center">Generating <span class="loading loading-spinner loading-md"></span></p>';

  try {
    const suggestions = await callGeminiApi(
      currentPdfTextForAnalysis,
      null,
      false,
      false,
      true,
      currentRegexTargetField,
      userPrompt
    );

    regexSuggestionsContainer.innerHTML = "";

    if (suggestions && suggestions.length > 0) {
      suggestions.forEach((regex, index) => {
        const div = document.createElement("div");
        div.className = "flex items-center mb-2";
        div.innerHTML = `
                    <input type="radio" name="regexSuggestion" id="regex-${index}" value="${encodeURIComponent(
          regex
        )}" class="mr-2">
                    <label for="regex-${index}" class="text-sm font-mono bg-base-100 p-1 rounded cursor-pointer flex-1 break-all">${regex}</label>
                `;
        regexSuggestionsContainer.appendChild(div);
      });
      useSelectedRegexButton.disabled = false;
      regexSuggestStatus.textContent =
        "Suggestions generated. Select one to use.";

      regexSuggestionsContainer.addEventListener(
        "change",
        handleRegexSelectionChange
      );
    } else {
      regexSuggestionsContainer.innerHTML =
        '<p class="text-sm text-error">No regex suggestions could be generated. Try a different prompt.</p>';
      regexSuggestStatus.textContent = "No suggestions.";
    }
  } catch (error) {
    regexSuggestionsContainer.innerHTML =
      '<p class="text-sm text-error">Failed to get suggestions. Check console for details.</p>';
    regexSuggestStatus.textContent = "Error generating suggestions.";
  } finally {
    generateRegexButton.disabled = false;
    updateTemplateButtonsState();
  }
}

const LOCAL_STORAGE_KEY = "invoiceTemplates";

function loadLocalConfigurations() {
  const storedConfigs = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    localConfigurations = storedConfigs ? JSON.parse(storedConfigs) : [];
  } catch (e) {
    localConfigurations = [];
  }
  populateConfigSelect();
  return localConfigurations;
}

function saveTemplateToLocalStorage() {
  const templateName = configNameInput.value.trim();
  if (!templateName) {
    showMessage(
      "error",
      "Please enter a template name to save the configuration."
    );
    return;
  }

  const newConfig = {
    name: templateName,
    officialSupplierNameForExport:
      officialSupplierNameForExportInput.value.trim(),
    supplierNamePattern: supplierNameRegexInput.value,
    documentDatePattern: documentDateRegexInput.value,
    documentNumberPattern: documentNumberRegexInput.value,
    totalAmountPattern: totalAmountRegexInput.value,
  };

  const existingIndex = localConfigurations.findIndex(
    (cfg) => cfg.name === templateName
  );

  if (existingIndex !== -1) {
    showConfirmationModal(
      "Overwrite Template?",
      `A template named "${templateName}" already exists. Do you want to overwrite it?`,
      "Overwrite",
      () => {
        localConfigurations[existingIndex] = newConfig;
        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(localConfigurations)
        );
        populateConfigSelect();
        showMessage("success", "Template updated successfully.");
      },
      () => {}
    );
  } else {
    localConfigurations.push(newConfig);
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(localConfigurations)
    );
    populateConfigSelect();
    showMessage("success", "Template saved successfully.");
  }
  updateTemplateButtonsState();
}

function deleteTemplateFromLocalStorage() {
  const selectedConfigName = configSelect.value;
  if (!selectedConfigName) {
    showMessage("info", "Please select a template to delete.");
    return;
  }

  showConfirmationModal(
    "Confirm Deletion",
    `Are you sure you want to delete the template "${selectedConfigName}"? This action cannot be undone.`,
    "Delete",
    () => {
      localConfigurations = localConfigurations.filter(
        (cfg) => cfg.name !== selectedConfigName
      );
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(localConfigurations)
      );
      resetConfigInputFields();
      populateConfigSelect();
      showMessage("success", "Template deleted successfully.");
    },
    () => {}
  );
  updateTemplateButtonsState();
}

function populateConfigSelect() {
  configSelect.innerHTML = '<option value="">-- Select a template --</option>';
  if (localConfigurations.length === 0) {
    configSelect.innerHTML =
      '<option value="">-- No templates available --</option>';
    return;
  }
  localConfigurations.forEach((config) => {
    const option = document.createElement("option");
    option.value = config.name;
    option.textContent = config.name;
    configSelect.appendChild(option);
  });
}

function exportAllConfigsToJson() {
  if (localConfigurations.length === 0) {
    showMessage("info", "There are no saved templates to export.");
    return;
  }

  const configJson = JSON.stringify(localConfigurations, null, 2);
  const blob = new Blob([configJson], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-templates-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMessage("success", "All templates exported successfully.");
}

function importConfigsFromJson() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          throw new Error(
            "Invalid JSON format. Expected an array of templates."
          );
        }

        let importedCount = 0;
        let overwrittenCount = 0;

        importedData.forEach((importedConfig) => {
          if (!importedConfig.name) {
            return;
          }
          const existingIndex = localConfigurations.findIndex(
            (cfg) => cfg.name === importedConfig.name
          );

          if (existingIndex !== -1) {
            localConfigurations[existingIndex] = importedConfig;
            overwrittenCount++;
          } else {
            localConfigurations.push(importedConfig);
            importedCount++;
          }
        });

        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(localConfigurations)
        );
        populateConfigSelect();
        showMessage(
          "success",
          `Successfully imported ${importedCount} new templates and updated ${overwrittenCount} existing templates.`
        );
      } catch (error) {
        showMessage(
          "error",
          "Failed to import configurations: " + error.message
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function handleFiles(files) {
  const pdfFiles = Array.from(files).filter(
    (file) => file.type === "application/pdf"
  );

  if (pdfFiles.length === 0) {
    if (uploadedFiles.length === 0) {
      showMessage("error", "Please select valid PDF file(s).");
    }
    updateProcessButtonsState();
    return;
  }

  pdfFiles.forEach((newFile) => {
    if (
      !uploadedFiles.some(
        (existingFile) =>
          existingFile.name === newFile.name &&
          existingFile.size === newFile.size
      )
    ) {
      uploadedFiles.push(newFile);
    }
  });

  updateInvoicesFileDisplay();
  hideMessage();
}

function removeIndividualFile(indexToRemove) {
  uploadedFiles = removeElementAtIndex(uploadedFiles, indexToRemove);

  const dataTransfer = new DataTransfer();
  uploadedFiles.forEach((file) => dataTransfer.items.add(file));
  fileInput.files = dataTransfer.files;

  updateInvoicesFileDisplay();
  if (uploadedFiles.length === 0) {
    hideMessage();
    resetExtractedFieldsForAnalysisTab();
  }
}

async function displayPdfTextForAnalysis(file) {
  if (!file || file.type !== "application/pdf") {
    pdfRawTextPreview.value = "";
    currentPdfTextForAnalysis = "";
    return;
  }
  currentAnalysisFileName.textContent = "( " + file.name + " )";

  const reader = new FileReader();
  reader.onload = async (e) => {
    const pdfData = new Uint8Array(e.target.result);
    try {
      const pdfjsLib = await getPDFLib();
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const currentPage = await pdf.getPage(i);
        const textContent = await currentPage.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
      }
      currentPdfTextForAnalysis = fullText;
      pdfRawTextPreview.value = fullText;
    } catch (error) {
      pdfRawTextPreview.value = "";
      showMessage("error", "Error extracting text from PDF: " + error.message);
      currentPdfTextForAnalysis = "";
    } finally {
      updateTemplateButtonsState();
    }
  };
  reader.readAsArrayBuffer(file);
}

function autoLoadSelectedConfiguration() {
  const selectedConfigName = configSelect.value;
  if (selectedConfigName === "") {
    resetConfigInputFields();
    return;
  }

  const selectedConfig = localConfigurations.find(
    (cfg) => cfg.name === selectedConfigName
  );

  if (selectedConfig) {
    activeConfig = selectedConfig;
    configNameInput.value = activeConfig.name || "";
    officialSupplierNameForExportInput.value =
      activeConfig.officialSupplierNameForExport || "";
    supplierNameRegexInput.value = activeConfig.supplierNamePattern || "";
    documentDateRegexInput.value = activeConfig.documentDatePattern || "";
    documentNumberRegexInput.value = activeConfig.documentNumberPattern || "";
    totalAmountRegexInput.value = activeConfig.totalAmountPattern || "";
  } else {
    showMessage("error", "Selected template not found in local storage.");
    activeConfig = null;
  }
  updateTemplateButtonsState();
  updateProcessButtonsState();
}

function handleRegexSelectionChange(event) {
  if (event.target.name === "regexSuggestion" && event.target.checked) {
    const selectedRegex = decodeURIComponent(event.target.value);
    testRegexInModal(selectedRegex);
    useSelectedRegexButton.disabled = false;
  }
}

function updateInvoicesFileDisplay() {
  filePillsContainer.innerHTML = "";

  if (uploadedFiles.length === 0) {
    fileInfo.classList.add("hidden");
    uploadLabel.classList.remove("hidden");
    hideMessage();
  } else {
    fileInfo.classList.remove("hidden");
    uploadLabel.classList.add("hidden");

    uploadedFiles.forEach((file, index) => {
      const filePill = document.createElement("span");
      filePill.className = "badge badge-md badge-info mr-2 mb-2";

      filePill.innerHTML = `
        ${file.name}
        <button type="button" class="ml-2" data-index="${index}">
          <svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
          </svg>
        </button>
      `;

      filePill.querySelector("button").addEventListener("click", (event) => {
        const fileIndexToRemove = parseInt(event.currentTarget.dataset.index);
        removeIndividualFile(fileIndexToRemove);
      });

      filePillsContainer.appendChild(filePill);
    });
    hideMessage();
  }
  updateProcessButtonsState();
}

function appendExtractedResultToTable(data, index) {
  const tableBody = resultsTableBody;

  const noDocsRow = tableBody.querySelector('tr td[colspan="7"]');
  if (noDocsRow) {
    noDocsRow.parentElement.remove();
  }

  const newRow = tableBody.insertRow();
  newRow.setAttribute("data-index", index);
  newRow.className = "table-row-base";

  newRow.innerHTML = `
      <td class="text-sm break-words max-w-[150px] overflow-hidden">${
        data.fileName
      }</td>
      <td class="text-xs">${data.configUsedName || "-"}</td>
      <td class="text-sm">${
        data.officialSupplierNameForExport || data.extractedSupplierName || "-"
      }</td>
      <td class="text-sm">${formatDateForDisplay(data.documentDate)}</td>
      <td class="text-sm">${data.documentNumber || "-"}</td>
      <td class="text-sm">${formatAmountForDisplay(data.totalAmount)}</td>
      <td>
          <button data-index="${index}" class="analyze-row-button btn btn-info btn-sm flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
      </td>
  `;

  newRow
    .querySelector(".analyze-row-button")
    .addEventListener("click", async (e) => {
      const clickedIndex = parseInt(e.target.closest("button").dataset.index);
      const dataToTemplate = allExtractedData[clickedIndex];
      const fileToTemplate = allExtractedData[clickedIndex].originalFile;

      switchTab("Template");

      await displayPdfTextForAnalysis(fileToTemplate);

      supplierNameSpan.textContent =
        dataToTemplate.extractedSupplierName || "-";
      documentDateSpan.textContent = formatDateForDisplay(
        dataToTemplate.documentDate
      );
      documentNumberSpan.textContent = dataToTemplate.documentNumber || "-";
      totalAmountSpan.textContent = formatAmountForDisplay(
        dataToTemplate.totalAmount
      );

      if (
        dataToTemplate.configUsedName &&
        dataToTemplate.configUsedName !== "-"
      ) {
        const foundConfig = localConfigurations.find(
          (cfg) => cfg.name === dataToTemplate.configUsedName
        );
        if (foundConfig) {
          configSelect.value = foundConfig.name;
          autoLoadSelectedConfiguration();
        } else {
          configSelect.value = "";
          activeConfig = null;
          resetConfigInputFields();
        }
      } else {
        configSelect.value = "";
        activeConfig = null;
        resetConfigInputFields();
      }

      updateTemplateButtonsState();
    });
}

function refreshExtractedResultsTable() {
  resultsTableBody.innerHTML = "";
  if (allExtractedData.length === 0) {
    resultsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No documents processed yet.</td></tr>';
  } else {
    allExtractedData.forEach((data, index) => {
      appendExtractedResultToTable(data, index);
    });
  }
}

function downloadCSVHandler() {
  if (allExtractedData.length === 0) {
    showMessage("info", "No data to export to CSV.");
    return;
  }

  const headers = [
    "Supplier Name",
    "Document Date",
    "Document Number",
    "Total Amount",
  ];

  const dataToExport = allExtractedData.map((data) => {
    const formattedDate = formatDateForDisplay(data.documentDate);
    const formattedAmount = formatAmountForDisplay(data.totalAmount) || "";
    return {
      "Supplier Name":
        data.officialSupplierNameForExport || data.extractedSupplierName,
      "Document Date": formattedDate,
      "Document Number": data.documentNumber,
      "Total Amount": formattedAmount,
    };
  });

  downloadCSV(dataToExport, headers, "invoices.csv");
}

function resetConfigInputFields() {
  configNameInput.value = "";
  officialSupplierNameForExportInput.value = "";
  supplierNameRegexInput.value = "";
  documentDateRegexInput.value = "";
  documentNumberRegexInput.value = "";
  totalAmountRegexInput.value = "";
  activeConfig = null;
  configSelect.value = "";
  updateTemplateButtonsState();
}

function resetExtractedFieldsForAnalysisTab() {
  supplierNameSpan.textContent = "-";
  documentDateSpan.textContent = "-";
  documentNumberSpan.textContent = "-";
  totalAmountSpan.textContent = "-";
  currentPdfTextForAnalysis = "";
  pdfRawTextPreview.value = "";
  updateTemplateButtonsState();
}

function clearAllResults() {
  allExtractedData = [];
  resultsTableBody.innerHTML =
    '<tr><td colspan="7" class="text-center">No documents processed yet.</td></tr>';
  updateProcessButtonsState();
}

function resetUI() {
  uploadedFiles = [];
  fileInput.value = "";
  updateInvoicesFileDisplay();
  currentPdfTextForAnalysis = "";
  resetExtractedFieldsForAnalysisTab();
  resetConfigInputFields();
  populateConfigSelect();
  hideConfirmationModal();
  clearAllResults();
  switchTab("Process");
  updateTemplateButtonsState();
  updateProcessButtonsState();
  processBtnText.textContent = "Process";
  spinnerProcess.classList.add("hidden");
  previewBtnText.textContent = "Preview";
  spinnerPreview.classList.add("hidden");
}

function updateProcessButtonsState() {
  const hasUploadedFiles = uploadedFiles.length > 0;
  const hasExtractedData = allExtractedData.length > 0;

  processBtn.disabled = !hasUploadedFiles;
  downloadBtn.disabled = !hasExtractedData;
}

function updateTemplateButtonsState() {
  const isPdfLoadedForAnalysis = currentPdfTextForAnalysis.length > 0;
  const hasConfigName = configNameInput.value.trim().length > 0;
  const isConfigSelected = configSelect.value !== "";

  previewButton.disabled = !isPdfLoadedForAnalysis;

  saveTemplateButton.disabled = !hasConfigName;

  deleteTemplateButton.disabled = !isConfigSelected;

  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = !isPdfLoadedForAnalysis;
  });
}

function switchTab(tabName) {
  if (tabName === "Process") {
    tabButtonProcess.classList.add("tab-active");
    tabButtonProcess.classList.remove("tab-button-inactive");
    tabButtonTemplate.classList.add("tab-button-inactive");
    tabButtonTemplate.classList.remove("tab-active");
    tabContentProcess.classList.remove("hidden");
    tabContentTemplate.classList.add("hidden");
    updateProcessButtonsState();
  } else if (tabName === "Template") {
    tabButtonTemplate.classList.add("tab-active");
    tabButtonTemplate.classList.remove("tab-button-inactive");
    tabButtonProcess.classList.add("tab-button-inactive");
    tabButtonProcess.classList.remove("tab-active");
    tabContentTemplate.classList.remove("hidden");
    tabContentProcess.classList.add("hidden");
    updateTemplateButtonsState();
    resetExtractedFieldsForAnalysisTab();
    if (!currentPdfTextForAnalysis && uploadedFiles.length > 0) {
      displayPdfTextForAnalysis(uploadedFiles[0]);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  switchTab("Process");
  updateInvoicesFileDisplay();
  updateTemplateButtonsState();
  updateProcessButtonsState();

  loadLocalConfigurations();

  tabButtonProcess.addEventListener("click", () => switchTab("Process"));
  tabButtonTemplate.addEventListener("click", () => switchTab("Template"));

  fileInput.addEventListener("change", (event) =>
    handleFiles(event.target.files)
  );
  removeAllFilesBtn.addEventListener("click", resetUI);

  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("border-primary", "bg-primary", "bg-opacity-10");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove(
      "border-primary",
      "bg-primary",
      "bg-opacity-10"
    );
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove(
      "border-primary",
      "bg-primary",
      "bg-opacity-10"
    );
    handleFiles(e.dataTransfer.files);
  });

  processBtn.addEventListener("click", async () => {
    if (uploadedFiles.length === 0) {
      showNoDocumentSelectedModal();
      return;
    }

    clearAllResults();
    resultsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Processing</td></tr>';
    updateProcessButtonsState();

    processBtnText.textContent = "Processing";
    spinnerProcess.classList.remove("hidden");
    processBtn.disabled = true;

    let processedCount = 0;
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.type !== "application/pdf") {
        continue;
      }

      const reader = new FileReader();
      const fileReadPromise = new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          const pdfData = new Uint8Array(e.target.result);
          try {
            const pdfjsLib = await getPDFLib();
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let fullText = "";
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const currentPage = await pdf.getPage(pageNum);
              const textContent = await currentPage.getTextContent();
              fullText +=
                textContent.items.map((item) => item.str).join(" ") + "\n";
            }
            resolve(fullText);
          } catch (error) {
            reject(
              `Error extracting text from PDF "${file.name}": ${error.message}`
            );
          }
        };
        reader.onerror = (error) =>
          reject(`FileReader error for "${file.name}": ${error}`);
        reader.readAsArrayBuffer(file);
      });

      try {
        const fileText = await fileReadPromise;
        let extractedData;
        let configUsedName = "-";
        let selectedConfigForExtraction = null;
        let officialSupplierNameForExport = null;

        if (localConfigurations.length > 0) {
          const classificationResult = classifyDocumentHeuristically(
            fileText,
            localConfigurations
          );

          if (
            classificationResult &&
            classificationResult.matchedConfigName &&
            classificationResult.matchedConfigName !== "-"
          ) {
            const matchedName = classificationResult.matchedConfigName;
            const foundConfig = localConfigurations.find(
              (cfg) => cfg.name === matchedName
            );
            if (foundConfig) {
              selectedConfigForExtraction = foundConfig;
              configUsedName = matchedName;
              officialSupplierNameForExport =
                foundConfig.officialSupplierNameForExport || null;
            }
          }
        }

        extractedData = await callGeminiApi(
          fileText,
          selectedConfigForExtraction,
          false,
          false,
          false
        );

        const formattedExtractedData = {
          originalFile: file,
          fileName: file.name,
          configUsedName: configUsedName,
          extractedSupplierName: extractedData.supplierName || "-",
          officialSupplierNameForExport: officialSupplierNameForExport,
          documentDate: extractedData.documentDate
            ? formatDateForDisplay(extractedData.documentDate)
            : "-",
          documentNumber: extractedData.documentNumber || "-",
          totalAmount: extractedData.totalAmount || null,
        };
        allExtractedData.push(formattedExtractedData);
      } catch (error) {
        const errorData = {
          originalFile: file,
          fileName: file.name,
          configUsedName: "Error",
          extractedSupplierName: "Error",
          officialSupplierNameForExport: "Error",
          documentDate: "Error",
          documentNumber: "Error",
          totalAmount: null,
          error: error.message,
        };
        allExtractedData.push(errorData);
        showMessage(
          "error",
          `Error processing file "${file.name}": ${error.message}`
        );
      }
      processedCount++;
    }

    allExtractedData.sort((a, b) => {
      const dateA = new Date(a.documentDate.split("/").reverse().join("-"));
      const dateB = new Date(b.documentDate.split("/").reverse().join("-"));

      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;

      return dateA.getTime() - dateB.getTime();
    });

    refreshExtractedResultsTable();

    if (allExtractedData.length > 0) {
      showMessage(
        "success",
        `Finished processing ${processedCount} PDF(s). Data ready for download.`
      );
    } else {
      showMessage(
        "warning",
        `Finished processing ${processedCount} PDF(s), but no data was extracted.`
      );
    }
    processBtnText.textContent = "Process";
    spinnerProcess.classList.add("hidden");
    updateProcessButtonsState();
  });

  previewButton.addEventListener("click", async () => {
    if (!currentPdfTextForAnalysis) {
      showNoDocumentSelectedModal();
      return;
    }

    previewBtnText.textContent = "Previewing";
    spinnerPreview.classList.remove("hidden");
    previewButton.disabled = true;

    try {
      const currentRegexs = {
        supplierNamePattern: supplierNameRegexInput.value,
        documentDatePattern: documentDateRegexInput.value,
        documentNumberPattern: documentNumberRegexInput.value,
        totalAmountPattern: totalAmountRegexInput.value,
      };

      const refinedData = await callGeminiApi(
        currentPdfTextForAnalysis,
        currentRegexs,
        true,
        false,
        false
      );

      if (refinedData) {
        supplierNameSpan.textContent = refinedData.supplierName || "-";
        documentDateSpan.textContent = formatDateForDisplay(
          refinedData.documentDate
        );
        documentNumberSpan.textContent = refinedData.documentNumber || "-";
        totalAmountSpan.textContent = formatAmountForDisplay(
          refinedData.totalAmount
        );
        showMessage("success", "Preview complete!");
      } else {
        showMessage("warning", "No refined data extracted during preview.");
      }
    } catch (error) {
      showMessage(
        "error",
        `Error during preview: ${error.message}. Check console for details.`
      );
    } finally {
      previewBtnText.textContent = "Preview";
      spinnerPreview.classList.add("hidden");
      updateTemplateButtonsState();
      updateProcessButtonsState();
    }
  });

  aiSuggestDateBtn.addEventListener("click", async () => {
    await showRegexSuggestModal("documentDate");
  });
  aiSuggestNumberBtn.addEventListener("click", async () => {
    await showRegexSuggestModal("documentNumber");
  });
  aiSuggestAmountBtn.addEventListener("click", async () => {
    await showRegexSuggestModal("totalAmount");
  });

  generateRegexButton.addEventListener("click", generateRegexSuggestions);
  cancelRegexSuggestButton.addEventListener("click", hideRegexSuggestModal);
  useSelectedRegexButton.addEventListener("click", useSelectedRegex);

  saveTemplateButton.addEventListener("click", saveTemplateToLocalStorage);
  deleteTemplateButton.addEventListener(
    "click",
    deleteTemplateFromLocalStorage
  );
  importConfigButton.addEventListener("click", importConfigsFromJson);
  exportAllConfigsButton.addEventListener("click", exportAllConfigsToJson);

  configSelect.addEventListener("change", autoLoadSelectedConfiguration);

  downloadBtn.addEventListener("click", downloadCSVHandler);

  configSelect.addEventListener("change", () => {
    updateTemplateButtonsState();
  });

  configNameInput.addEventListener("input", updateTemplateButtonsState);
  officialSupplierNameForExportInput.addEventListener(
    "input",
    updateTemplateButtonsState
  );
  supplierNameRegexInput.addEventListener("input", updateTemplateButtonsState);
  documentDateRegexInput.addEventListener("input", updateTemplateButtonsState);
  documentNumberRegexInput.addEventListener(
    "input",
    updateTemplateButtonsState
  );
  totalAmountRegexInput.addEventListener("input", updateTemplateButtonsState);
});
