// invoice.js

// --- IMPORTANT: Import your main CSS file here to be processed by Vite ---
import "./style.css";

// --- Import utility functions ---
import {
  getGeminiApiKey,
  showApiKeyModal,
  showConfirmationModal,
  hideConfirmationModal,
  downloadCSV,
  formatAmountForDisplay,
  formatDateForDisplay,
  FileListShim, // Keep if still used elsewhere, otherwise can be removed if not needed for file handling
  showMessage,
  hideMessage,
} from "./utils.js";

// --- 1. Global Variables and DOM Element References ---

// Main application state
let uploadedFiles = [];
let currentPdfTextForAnalysis = ""; // Stores text of the PDF currently displayed in Template tab
let activeConfig = null; // The currently loaded template configuration
let localConfigurations = []; // Array of configurations loaded from localStorage
let allExtractedData = []; // All extracted invoice data from processed PDFs
let currentRegexTargetField = null; // Field for which AI regex suggestions are being generated (e.g., 'documentDate')

// API related constants
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Debugging flag
const DEBUG_MODE = true; // Set to false for production to disable logDebug calls

// DOM Element References (cached for performance)
const pdfUpload = document.getElementById("pdfUpload");
const pdfRawTextPreview = document.getElementById("pdfRawTextPreview");
const processPdfButton = document.getElementById("processPdfButton");
const processingStatus = document.getElementById("processingStatus");
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
const dropArea = document.getElementById("dropArea");
const uploadedFilesList = document.getElementById("uploadedFilesList"); // This is the container for the file pills
const allExtractedResultsContainer = document.getElementById(
  "allExtractedResultsContainer"
);
const extractedResultsTableBody = document.getElementById(
  "extractedResultsTableBody"
);
const downloadCsvButton = document.getElementById("downloadCsvButton");
const clearUploadFormButton = document.getElementById("clearUploadFormButton");
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

// Get references for upload label and file info container for visibility toggling
const uploadLabelInvoice = document.getElementById("upload-label-invoice");
const fileInfoInvoice = document.getElementById("file-info-invoice");

// --- 2. Utility Functions (Removed local ones, using imported) ---

/**
 * Logs a message to the console if DEBUG_MODE is enabled.
 * @param {string} message - The message to log.
 */
function logDebug(message) {
  if (DEBUG_MODE) {
    console.log("[DEBUG]", message);
  }
}

/**
 * Shows a confirmation modal indicating that no document is selected.
 */
function showNoDocumentSelectedModal() {
  showConfirmationModal(
    "No Document Selected",
    "Please select a document from the 'Extract' tab first to proceed.",
    "OK",
    () => {},
    () => {}
  );
}

/**
 * Shows the regex suggestion modal for a specific field.
 * @param {string} fieldName - The name of the field for which regex is suggested (e.g., "documentDate").
 */
function showRegexSuggestModal(fieldName) {
  currentRegexTargetField = fieldName;
  // Update modal title dynamically
  regexSuggestModalTitle.textContent = `AI Regex Suggestions for ${fieldName
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .replace("document ", "")}`; // Format for display

  // Reset modal content
  regexUserPrompt.value = "";
  regexSuggestionsContainer.innerHTML =
    '<p id="noSuggestionsText" class="text-sm p-secondary">Click "Generate Suggestions" to get AI help.</p>';
  useSelectedRegexButton.disabled = true;
  regexSuggestStatus.textContent = "";
  regexTestResult.textContent = "Test Result: No regex tested yet.";

  // Use showModal() to display the dialog
  regexSuggestModal.showModal();
}

/**
 * Hides the regex suggestion modal.
 */
function hideRegexSuggestModal() {
  // Use close() to hide the dialog
  regexSuggestModal.close();
  currentRegexTargetField = null; // Clear target field
}

/**
 * Tests a given regex pattern against the current PDF text in the modal and displays the result.
 * @param {string} regexPattern - The regex pattern to test.
 */
function testRegexInModal(regexPattern) {
  if (!currentPdfTextForAnalysis) {
    regexTestResult.textContent =
      "Test Result: Error - No PDF text loaded for analysis.";
    regexTestResult.classList.add("text-red-500");
    return;
  }

  // Clear previous test result styling
  regexTestResult.classList.remove("text-red-500", "text-green-500");

  try {
    const regex = new RegExp(regexPattern, "i"); // Case-insensitive regex
    const match = currentPdfTextForAnalysis.match(regex); // Perform the match

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

/**
 * Applies the selected regex suggestion to the corresponding input field and triggers a preview.
 */
function useSelectedRegex() {
  const selectedRadio = regexSuggestionsContainer.querySelector(
    'input[name="regexSuggestion"]:checked'
  );
  if (selectedRadio) {
    const selectedRegex = decodeURIComponent(selectedRadio.value); // Decode URL-encoded regex
    // Assign selected regex to the correct input field
    if (currentRegexTargetField === "documentDate") {
      documentDateRegexInput.value = selectedRegex;
    } else if (currentRegexTargetField === "documentNumber") {
      documentNumberRegexInput.value = selectedRegex;
    } else if (currentRegexTargetField === "totalAmount") {
      totalAmountRegexInput.value = selectedRegex;
    }
    hideRegexSuggestModal(); // Close modal
    previewButton.click(); // Trigger a preview to see the effect of the new regex
  } else {
    // Use a custom modal for alerts instead of browser alert()
    showConfirmationModal(
      "Selection Required",
      "Please select a regex suggestion first.",
      "OK",
      () => {}, // No action on OK
      () => {} // No action on Cancel
    );
  }
}

// --- 3. Data Extraction and AI Interaction Functions ---

/**
 * Extracts data from PDF text using provided regex patterns or a heuristic approach.
 * This function can also generate regex suggestions or classify documents.
 * It integrates with the Gemini API for AI-powered features.
 * @param {string} pdfText - The text content of the PDF.
 * @param {Object} [config=null] - An optional configuration object with regex patterns.
 * @param {boolean} [isRefine=false] - True if this is a refinement (preview) operation.
 * @param {boolean} [classifyOnly=false] - True if only document classification is needed.
 * @param {boolean} [useLlmsForOperation=true] - True to use LLMs, false to use regex directly.
 * @param {string} [generateRegexForField=null] - If provided, AI will generate regex for this field.
 * @param {string} [userContextForRegex=null] - Optional user prompt for regex generation.
 * @returns {Promise<Object|Array<string>|null>} Extracted data, regex suggestions, or classification result.
 * @throws {Error} If API call fails or invalid response is received.
 */
async function callGeminiApi(
  pdfText,
  config = null,
  isRefine = false,
  classifyOnly = false,
  useLlmsForOperation = true,
  generateRegexForField = null,
  userContextForRegex = null
) {
  let currentGeminiApiKey = getGeminiApiKey(); // Get current API key

  if (useLlmsForOperation && !currentGeminiApiKey) {
    try {
      const key = await showApiKeyModal(); // Use utility function to show modal
      if (!key) {
        // If user cancels or doesn't provide a key
        showConfirmationModal(
          "API Key Required",
          "Gemini API key is required for AI-powered features. Operation canceled.",
          "OK",
          () => {},
          () => {}
        );
        return null;
      }
      currentGeminiApiKey = key; // Update key if saved
    } catch (error) {
      console.error("Error getting Gemini API key:", error);
      showConfirmationModal(
        "API Key Error",
        "Could not get Gemini API key. Operation canceled.",
        "OK",
        () => {},
        () => {}
      );
      return null;
    }
  }

  // Disable buttons during API call
  processPdfButton.disabled = true;
  previewButton.disabled = true;
  saveTemplateButton.disabled = true;
  deleteTemplateButton.disabled = true;
  importConfigButton.disabled = true;
  exportAllConfigsButton.disabled = true;

  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = true;
  });

  let prompt;
  let responseMimeType = "application/json";
  let normalizedResult = {}; // To store the parsed result

  // Logic for document classification (heuristic)
  if (classifyOnly && localConfigurations.length > 0) {
    processingStatus.textContent = "Identifying best template heuristically...";
    normalizedResult = classifyDocumentHeuristically(
      pdfText,
      localConfigurations
    );
    processingStatus.textContent = "Heuristic classification complete!";
    return normalizedResult;
  }
  // Logic for generating regex suggestions
  else if (generateRegexForField) {
    processingStatus.textContent = "Generating regex suggestions...";
    regexSuggestStatus.textContent = "Generating suggestions...";
    let regexPrompt = `From the following document text, suggest 3-5 JavaScript-compatible regular expressions (regex) to extract the "${generateRegexForField}" field. Provide only the regex patterns, in a JSON array format like {"regexSuggestions": ["regex1", "regex2", "regex3"]}. The regex should include a capturing group for the value if applicable, and be suitable for use with JavaScript's String.prototype.match() method.`;
    if (userContextForRegex) {
      regexPrompt += `\n\nAdditional context from user: "${userContextForRegex}"`;
    }
    // Truncate PDF text to avoid exceeding token limits for prompt
    prompt = `${regexPrompt}\nDocument Text: "${pdfText.substring(
      0,
      Math.min(pdfText.length, 1500)
    )}"`;
    responseMimeType = "application/json"; // Expecting JSON array of regexes
  }
  // Logic for direct regex extraction (no LLM)
  else if (!useLlmsForOperation) {
    processingStatus.textContent = isRefine
      ? "Previewing with current regex..."
      : "Processing with selected template (using regex)...";
    normalizedResult = extractDataWithRegex(pdfText, config);
    processingStatus.textContent = isRefine
      ? "Preview complete!"
      : "Processing complete!";
    return normalizedResult;
  }
  // Logic for general AI-powered extraction (using LLM)
  else {
    processingStatus.textContent = "Sending to AI for initial analysis...";
    prompt = `Extract the following information from the invoice/receipt text:\n`;
    prompt += `- Supplier Name\n- Document Date\n- Document Number\n- Total Amount\n\n`;
    prompt += `Return the results in a JSON object with keys: "supplierName", "documentDate", "documentNumber", "totalAmount".\n`;
    prompt += `If a value is not found, return null for that key. Ensure Total Amount is a number (e.g., 123.45). Date should be in DD/MM/YYYY format.\n\n`;

    // Add extraction guidelines from config if available
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
      `${GEMINI_API_ENDPOINT}?key=${currentGeminiApiKey}`, // Use current key
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
    // Validate API response structure
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
      // For regex generation, expect an object with regexSuggestions array
      if (rawResult && Array.isArray(rawResult.regexSuggestions)) {
        processingStatus.textContent = "Regex suggestions generated.";
        regexSuggestStatus.textContent =
          "Suggestions generated. Select one to use.";
        return rawResult.regexSuggestions;
      }
      processingStatus.textContent = "No regex suggestions could be generated.";
      regexSuggestStatus.textContent =
        "No regex suggestions could be generated.";
      return []; // Return empty array if no suggestions
    } else {
      // For extraction, normalize result (can be an array with one object or direct object)
      if (Array.isArray(rawResult) && rawResult.length > 0) {
        normalizedResult = rawResult[0];
      } else if (typeof rawResult === "object" && rawResult !== null) {
        normalizedResult = rawResult;
      }
      processingStatus.textContent = classifyOnly
        ? "Classification complete!"
        : isRefine
        ? "Preview complete!"
        : "AI analysis complete!";
      return normalizedResult;
    }
  } catch (error) {
    // Show error message using the utility function
    showMessage("error", `AI operation failed: ${error.message}`);
    // No need to update processingStatus.textContent as showMessage handles it
    regexSuggestStatus.textContent = `Error: ${error.message}`; // Update status in regex modal
    throw error; // Re-throw to propagate error
  } finally {
    // Ensure buttons are re-enabled after API call
    updateTemplateTabButtonsState();
    updateProcessTabButtonsState();
  }
}

/**
 * Extracts data from a PDF text using regular expressions defined in a configuration.
 * @param {string} pdfText - The text content of the PDF.
 * @param {Object} config - The configuration object containing regex patterns.
 * @returns {Object} An object with extracted supplierName, documentDate, documentNumber, and totalAmount.
 */
function extractDataWithRegex(pdfText, config) {
  const extracted = {
    supplierName: null,
    documentDate: null,
    documentNumber: null,
    totalAmount: null,
  };

  /**
   * Helper function to extract a value using a regex pattern.
   * @param {string} text - The text to search within.
   * @param {string} pattern - The regex pattern string.
   * @returns {string|null} The extracted value or null if not found or invalid pattern.
   */
  const extractValue = (text, pattern) => {
    if (!pattern) return null;
    try {
      const regex = new RegExp(pattern, "i"); // Case-insensitive
      const match = text.match(regex);
      if (match) {
        // Return captured group 1 if it exists, otherwise the full match
        return match[1] ? match[1].trim() : match[0].trim();
      }
      return null;
    } catch (e) {
      console.error("Invalid regex pattern:", pattern, e);
      return null;
    }
  };

  if (config) {
    extracted.supplierName = extractValue(pdfText, config.supplierNamePattern);
    let docDate = extractValue(pdfText, config.documentDatePattern);
    extracted.documentDate = docDate; // Date will be formatted for display later

    let docNumber = extractValue(pdfText, config.documentNumberPattern);
    if (docNumber) {
      // Clean document number: remove extra spaces or dashes
      docNumber = docNumber
        .replace(/\s*-\s*/g, "-")
        .replace(/\s+/g, "")
        .trim();
    }
    extracted.documentNumber = docNumber;

    const totalAmountStr = extractValue(pdfText, config.totalAmountPattern);
    if (totalAmountStr) {
      // Clean amount: remove non-numeric characters except dot
      const cleanedAmount = totalAmountStr.replace(/[^0-9.]/g, "");
      const parsedAmount = parseFloat(cleanedAmount);
      if (!isNaN(parsedAmount)) {
        extracted.totalAmount = parsedAmount;
      }
    }
  }
  return extracted;
}

/**
 * Classifies a document to a known template heuristically based on regex pattern matches.
 * @param {string} pdfText - The text content of the PDF.
 * @param {Array<Object>} configurations - Array of template configurations.
 * @returns {Object} An object indicating the matched configuration name and score.
 */
function classifyDocumentHeuristically(pdfText, configurations) {
  let scores = [];

  /**
   * Helper to test if a pattern exists in text.
   * @param {string} text - The text to search.
   * @param {string} pattern - The regex pattern string.
   * @returns {boolean} True if pattern matches, false otherwise or if pattern is invalid.
   */
  const testPattern = (text, pattern) => {
    if (!pattern) return false;
    try {
      return new RegExp(pattern, "i").test(text);
    } catch (e) {
      console.error("Invalid regex pattern for testing:", pattern, e);
      return false; // Invalid regex pattern
    }
  };

  for (const config of configurations) {
    let currentScore = 0;
    // Assign higher scores for more unique identifiers
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
    return { matchedConfigName: "None" }; // No templates matched
  }

  scores.sort((a, b) => b.score - a.score); // Sort by score descending
  const bestMatch = scores[0];

  // A threshold score to consider it a "good" match
  if (bestMatch.score >= 3) {
    return { matchedConfigName: bestMatch.configName };
  } else {
    return { matchedConfigName: "None" }; // Match is too weak, consider it "None"
  }
}

/**
 * Generates regex suggestions for a specific field using the Gemini API.
 */
async function generateRegexSuggestions() {
  if (!currentPdfTextForAnalysis) {
    showConfirmationModal(
      "Missing PDF",
      "A PDF must be loaded for analysis to generate regex suggestions.",
      "OK",
      () => {},
      () => {}
    );
    return;
  }

  if (!getGeminiApiKey()) {
    await showApiKeyModal(); // Use utility function to prompt for key
    if (!getGeminiApiKey()) {
      // Check again after modal closes
      showConfirmationModal(
        "API Key Required",
        "Gemini API key is required for AI-powered features. Operation canceled.",
        "OK",
        () => {},
        () => {}
      );
      generateRegexButton.disabled = false; // Re-enable button if no key
      updateTemplateTabButtonsState();
      return;
    }
  }

  const userPrompt = regexUserPrompt.value.trim();
  regexSuggestStatus.textContent = "Generating suggestions...";
  generateRegexButton.disabled = true; // Disable button during generation
  useSelectedRegexButton.disabled = true; // Disable "Use Selected" button
  regexSuggestionsContainer.innerHTML =
    '<p class="text-center"><div class="spinner border-t-blue-500 border-4 border-gray-200 h-6 w-6 rounded-full inline-block"></div> Generating...</p>';

  try {
    const suggestions = await callGeminiApi(
      currentPdfTextForAnalysis,
      null,
      false,
      false,
      true, // Use LLM for this operation
      currentRegexTargetField,
      userPrompt
    );

    regexSuggestionsContainer.innerHTML = ""; // Clear loading message

    if (suggestions && suggestions.length > 0) {
      // Display each suggestion as a radio button
      suggestions.forEach((regex, index) => {
        const div = document.createElement("div");
        div.className = "flex items-center mb-2";
        div.innerHTML = `
                    <input type="radio" name="regexSuggestion" id="regex-${index}" value="${encodeURIComponent(
          regex
        )}" class="mr-2">
                    <label for="regex-${index}" class="text-sm font-mono bg-light-bg-primary dark:bg-dark-bg-primary p-1 rounded cursor-pointer flex-1 break-all">${regex}</label>
                `;
        regexSuggestionsContainer.appendChild(div);
      });
      useSelectedRegexButton.disabled = false; // Enable "Use Selected"
      regexSuggestStatus.textContent =
        "Suggestions generated. Select one to use.";

      // Add event listener for radio button changes to test regex
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
    console.error("Error generating regex suggestions:", error);
    regexSuggestionsContainer.innerHTML =
      '<p class="text-sm text-error">Failed to get suggestions. Check console for details.</p>';
    regexSuggestStatus.textContent = "Error generating suggestions.";
  } finally {
    generateRegexButton.disabled = false; // Re-enable generate button
  }
}

// --- 4. Local Storage Template Management Functions ---

const LOCAL_STORAGE_KEY = "invoiceTemplates";

/**
 * Loads configurations from local storage.
 * @returns {Array<Object>} An array of template configuration objects.
 */
function loadLocalConfigurations() {
  const storedConfigs = localStorage.getItem(LOCAL_STORAGE_KEY);
  try {
    localConfigurations = storedConfigs ? JSON.parse(storedConfigs) : [];
  } catch (e) {
    console.error("Error parsing local storage configurations:", e);
    localConfigurations = [];
  }
  populateConfigSelect(); // Update the dropdown after loading
  return localConfigurations;
}

/**
 * Saves the current template configuration to local storage.
 */
function saveTemplateToLocalStorage() {
  const templateName = configNameInput.value.trim();
  if (!templateName) {
    showConfirmationModal(
      // Use utility function
      "Missing Template Name",
      "Please enter a template name to save the configuration.",
      "OK",
      () => {},
      () => {}
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
      // Use utility function
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
        showConfirmationModal(
          // Use utility function
          "Success",
          "Template updated successfully.",
          "OK",
          () => {},
          () => {}
        );
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
    showConfirmationModal(
      // Use utility function
      "Success",
      "Template saved successfully.",
      "OK",
      () => {},
      () => {}
    );
  }
  updateTemplateTabButtonsState();
}

/**
 * Deletes the currently selected template from local storage.
 */
function deleteTemplateFromLocalStorage() {
  const selectedConfigName = configSelect.value;
  if (!selectedConfigName) {
    showConfirmationModal(
      // Use utility function
      "No Template Selected",
      "Please select a template to delete.",
      "OK",
      () => {},
      () => {}
    );
    return;
  }

  showConfirmationModal(
    // Use utility function
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
      resetConfigInputFields(); // Clear fields
      populateConfigSelect(); // Update dropdown
      showConfirmationModal(
        // Use utility function
        "Success",
        "Template deleted successfully.",
        "OK",
        () => {},
        () => {}
      );
    },
    () => {}
  );
  updateTemplateTabButtonsState();
}

/**
 * Populates the template selection dropdown with configurations from local storage.
 */
function populateConfigSelect() {
  configSelect.innerHTML = '<option value="">-- Select a template --</option>';
  if (localConfigurations.length === 0) {
    configSelect.innerHTML =
      '<option value="">-- No templates available --</option>';
    return;
  }
  localConfigurations.forEach((config) => {
    const option = document.createElement("option");
    option.value = config.name; // Use name as value
    option.textContent = config.name;
    configSelect.appendChild(option);
  });
}

/**
 * Exports all saved configurations to a JSON file.
 */
function exportAllConfigsToJson() {
  if (localConfigurations.length === 0) {
    showConfirmationModal(
      // Use utility function
      "No Data to Export",
      "There are no saved templates to export.",
      "OK",
      () => {},
      () => {}
    );
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
  showConfirmationModal(
    // Use utility function
    "Export Complete",
    "All templates exported successfully.",
    "OK",
    () => {},
    () => {}
  );
}

/**
 * Imports configurations from a JSON file, merging with existing local storage data.
 * Overwrites templates with matching names.
 */
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
            console.warn(
              "Skipping imported template due to missing name:",
              importedConfig
            );
            return;
          }
          const existingIndex = localConfigurations.findIndex(
            (cfg) => cfg.name === importedConfig.name
          );

          if (existingIndex !== -1) {
            // Overwrite existing
            localConfigurations[existingIndex] = importedConfig;
            overwrittenCount++;
          } else {
            // Add new
            localConfigurations.push(importedConfig);
            importedCount++;
          }
        });

        localStorage.setItem(
          LOCAL_STORAGE_KEY,
          JSON.stringify(localConfigurations)
        );
        populateConfigSelect();
        showConfirmationModal(
          // Use utility function
          "Import Complete",
          `Successfully imported ${importedCount} new templates and updated ${overwrittenCount} existing templates.`,
          "OK",
          () => {},
          () => {}
        );
      } catch (error) {
        showConfirmationModal(
          // Use utility function
          "Import Error",
          "Failed to import configurations: " + error.message,
          "OK",
          () => {},
          () => {}
        );
        console.error("Error importing configurations:", error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// --- 5. UI Event Handlers (Specific to Invoice App) ---

/**
 * Handles file selection from input or drag-and-drop.
 * Filters for PDF files and adds them to the uploadedFiles array.
 * @param {FileList} files - The FileList object from the event.
 */
function handleFiles(files) {
  const pdfFiles = Array.from(files).filter(
    (file) => file.type === "application/pdf"
  );

  if (pdfFiles.length === 0) {
    if (uploadedFiles.length === 0) {
      // Only show error if no files are currently selected
      showMessage("error", "Please select valid PDF file(s).");
    }
    updateProcessTabButtonsState(); // Update button state
    return;
  }

  pdfFiles.forEach((newFile) => {
    // Check for uniqueness based on name and size before adding
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

  updateInvoiceFileDisplay(); // Refresh the file display in UI
  hideMessage(); // Clear any previous messages
}

/**
 * Removes an individual file from the `uploadedFiles` array and updates the display.
 * @param {number} indexToRemove - The index of the file to remove.
 */
function removeUploadedFile(indexToRemove) {
  uploadedFiles.splice(indexToRemove, 1); // Remove file from array

  // Update the file input's internal file list for consistency (important for re-uploading same file)
  const dataTransfer = new DataTransfer();
  uploadedFiles.forEach((file) => dataTransfer.items.add(file));
  pdfUpload.files = dataTransfer.files;

  updateInvoiceFileDisplay(); // Update UI
  if (uploadedFiles.length === 0) {
    hideMessage(); // Hide message if no files are left
    // Also reset the PDF preview in the template tab if the last file was removed
    resetExtractedFieldsForAnalysisTab();
  }
}

/**
 * Extracts and displays the raw text content of a PDF file in the text area.
 * @param {File} file - The PDF File object to process.
 */
async function displayPdfTextForAnalysis(file) {
  // Clear text area and reset display if no valid file
  if (!file || file.type !== "application/pdf") {
    pdfRawTextPreview.value = "";
    currentAnalysisFileName.textContent = "-";
    currentPdfTextForAnalysis = "";
    return;
  }
  currentAnalysisFileName.textContent = file.name; // Display filename

  const reader = new FileReader();
  reader.onload = async (e) => {
    const pdfData = new Uint8Array(e.target.result);
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const currentPage = await pdf.getPage(i);
        const textContent = await currentPage.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
      }
      currentPdfTextForAnalysis = fullText; // Store extracted text for analysis
      pdfRawTextPreview.value = fullText; // Display text in the textarea
    } catch (error) {
      pdfRawTextPreview.value = ""; // Clear text area on error
      showConfirmationModal(
        // Use utility function
        "PDF Text Extraction Error",
        "Error extracting text from PDF: " + error.message,
        "OK",
        () => {},
        () => {}
      );
      console.error("PDF Text Extraction Error:", error);
      currentPdfTextForAnalysis = ""; // Clear text on error
    } finally {
      updateTemplateTabButtonsState(); // Re-enable buttons
    }
  };
  reader.readAsArrayBuffer(file); // Start reading the file
}

/**
 * Loads the currently selected configuration from the dropdown into the input fields automatically.
 */
function autoLoadSelectedConfiguration() {
  const selectedConfigName = configSelect.value;
  if (selectedConfigName === "") {
    resetConfigInputFields(); // Clear fields if "Select a template" is chosen
    return;
  }

  // Find the selected configuration by name
  const selectedConfig = localConfigurations.find(
    (cfg) => cfg.name === selectedConfigName
  );

  if (selectedConfig) {
    activeConfig = selectedConfig; // Set active config
    // Populate input fields with loaded data
    configNameInput.value = activeConfig.name || "";
    officialSupplierNameForExportInput.value =
      activeConfig.officialSupplierNameForExport || "";
    supplierNameRegexInput.value = activeConfig.supplierNamePattern || "";
    documentDateRegexInput.value = activeConfig.documentDatePattern || "";
    documentNumberRegexInput.value = activeConfig.documentNumberPattern || "";
    totalAmountRegexInput.value = activeConfig.totalAmountPattern || "";
  } else {
    // This case should ideally not happen if dropdown is populated correctly
    showConfirmationModal(
      // Use utility function
      "Template Not Found",
      "Selected template not found in local storage.",
      "OK",
      () => {},
      () => {}
    );
    activeConfig = null; // Clear active config
  }
  updateTemplateTabButtonsState(); // Re-enable buttons
  updateProcessTabButtonsState();
}

/**
 * Handles changes in the selected regex suggestion radio buttons to test the regex.
 * @param {Event} event - The change event from the radio button.
 */
function handleRegexSelectionChange(event) {
  if (event.target.name === "regexSuggestion" && event.target.checked) {
    const selectedRegex = decodeURIComponent(event.target.value);
    testRegexInModal(selectedRegex); // Test the selected regex
    useSelectedRegexButton.disabled = false; // Enable "Use Selected" button
  }
}

/**
 * Updates the display of uploaded files in the "Extract" tab.
 */
function updateInvoiceFileDisplay() {
  uploadedFilesList.innerHTML = ""; // Clear existing pills

  if (uploadedFiles.length === 0) {
    fileInfoInvoice.classList.add("hidden"); // Hide file info section
    uploadLabelInvoice.classList.remove("hidden"); // Show upload label
    processingStatus.textContent = ""; // Clear the text when no files are selected
    hideMessage(); // Hide any message box when no files are selected
  } else {
    fileInfoInvoice.classList.remove("hidden"); // Show file info
    uploadLabelInvoice.classList.add("hidden"); // Hide upload prompt

    uploadedFiles.forEach((file, index) => {
      const filePill = document.createElement("span"); // Use span as in index.js for pills
      filePill.className = "badge badge-md badge-info mr-2 mb-2"; // Apply DaisyUI badge class and margin

      // Construct the inner HTML for the pill, including the remove button
      filePill.innerHTML = `
        ${file.name}
        <button type="button" class="ml-2" data-index="${index}">
          <svg class="h-3 w-3" stroke="currentColor" fill="none" viewBox="0 0 8 8">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
          </svg>
        </button>
      `;

      // Attach the click event listener directly to the button within the pill
      filePill.querySelector("button").addEventListener("click", (event) => {
        const fileIndexToRemove = parseInt(event.currentTarget.dataset.index);
        removeUploadedFile(fileIndexToRemove); // Call the new function to remove the file
      });

      uploadedFilesList.appendChild(filePill); // Add the created pill to the container
    });
    processingStatus.textContent = `${uploadedFiles.length} file(s) selected. Click Process PDF(s).`;
    hideMessage(); // Hide any message box when files are selected
  }
  updateProcessTabButtonsState();
}

/**
 * Appends an extracted result row to the processed results table.
 * @param {Object} data - The extracted data object for a single file.
 * @param {number} index - The index of the data in the `allExtractedData` array.
 */
function appendExtractedResultToTable(data, index) {
  const tableBody = extractedResultsTableBody;

  // Remove the "No documents processed yet." row if it exists
  const noDocsRow = tableBody.querySelector('tr td[colspan="7"]');
  if (noDocsRow) {
    noDocsRow.parentElement.remove();
  }

  // Insert new row at the end of the table
  const newRow = tableBody.insertRow(); // Appends to the end
  newRow.setAttribute("data-index", index);
  newRow.className = "table-row-base"; // Use new custom class

  // Populate row cells with data
  newRow.innerHTML = `
      <td class="text-sm break-words max-w-[150px] overflow-hidden">${
        data.fileName
      }</td>
      <td class="text-xs">${data.configUsedName || "-"}</td>
      <td class="text-sm">${
        data.officialSupplierNameForExport || data.extractedSupplierName || "-"
      }</td>
      <td class="text-sm">${formatDateForDisplay(
        // Use utility function
        data.documentDate
      )}</td>
      <td class="text-sm">${data.documentNumber || "-"}</td>
      <td class="text-sm">${formatAmountForDisplay(
        // Use utility function
        data.totalAmount
      )}</td>
      <td>
          <button data-index="${index}" class="analyze-row-button btn btn-info btn-sm flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
      </td>
  `;

  // Add event listener to "Template" button in the row
  newRow
    .querySelector(".analyze-row-button")
    .addEventListener("click", async (e) => {
      const clickedIndex = parseInt(e.target.closest("button").dataset.index);
      const dataToTemplate = allExtractedData[clickedIndex];
      const fileToTemplate = allExtractedData[clickedIndex].originalFile;

      switchTab("Template"); // Switch to Template tab

      await displayPdfTextForAnalysis(fileToTemplate); // Display raw text for analysis

      // Populate extracted information display
      supplierNameSpan.textContent =
        dataToTemplate.extractedSupplierName || "-";
      documentDateSpan.textContent = formatDateForDisplay(
        // Use utility function
        dataToTemplate.documentDate
      );
      documentNumberSpan.textContent = dataToTemplate.documentNumber || "-";
      totalAmountSpan.textContent = formatAmountForDisplay(
        // Use utility function
        dataToTemplate.totalAmount
      );

      // If a configuration was used, try to load it into the template editor
      if (
        dataToTemplate.configUsedName &&
        dataToTemplate.configUsedName !== "-"
      ) {
        const foundConfig = localConfigurations.find(
          (cfg) => cfg.name === dataToTemplate.configUsedName
        );
        if (foundConfig) {
          configSelect.value = foundConfig.name; // Select in dropdown by name
          autoLoadSelectedConfiguration(); // Load details into inputs
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

      updateTemplateTabButtonsState();
    });
}

/**
 * Redraws the extracted results table based on the current `allExtractedData`.
 * This is useful after sorting.
 */
function refreshExtractedResultsTable() {
  extractedResultsTableBody.innerHTML = ""; // Clear existing rows
  if (allExtractedData.length === 0) {
    extractedResultsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">No documents processed yet.</td></tr>';
  } else {
    allExtractedData.forEach((data, index) => {
      // Pass the current index to appendExtractedResultToTable
      appendExtractedResultToTable(data, index);
    });
  }
}

/**
 * Downloads all extracted data as a CSV file.
 */
function downloadCSVHandler() {
  // Renamed to avoid clash with imported downloadCSV
  if (allExtractedData.length === 0) {
    showMessage(
      // Use utility function for info message
      "info",
      "No data to export to CSV."
    );
    return;
  }

  const headers = [
    "Supplier Name",
    "Document Date",
    "Document Number",
    "Total Amount",
  ];

  const dataToExport = allExtractedData.map((data) => {
    const formattedDate = formatDateForDisplay(data.documentDate); // Use utility function
    const formattedAmount = formatAmountForDisplay(data.totalAmount) || ""; // Use utility function
    return {
      "Supplier Name":
        data.officialSupplierNameForExport || data.extractedSupplierName,
      "Document Date": formattedDate,
      "Document Number": data.documentNumber,
      "Total Amount": formattedAmount,
    };
  });

  downloadCSV(dataToExport, headers, "invoices.csv"); // Use imported downloadCSV
}

// --- 6. UI State Management and Reset Functions ---

/**
 * Resets all input fields in the "Template" editor tab.
 */
function resetConfigInputFields() {
  configNameInput.value = "";
  officialSupplierNameForExportInput.value = "";
  supplierNameRegexInput.value = "";
  documentDateRegexInput.value = "";
  documentNumberRegexInput.value = "";
  totalAmountRegexInput.value = "";
  activeConfig = null; // Clear active config
  configSelect.value = ""; // Reset dropdown
  updateTemplateTabButtonsState();
}

/**
 * Resets the displayed extracted fields and PDF raw text preview in the "Template" tab.
 */
function resetExtractedFieldsForAnalysisTab() {
  supplierNameSpan.textContent = "-";
  documentDateSpan.textContent = "-";
  documentNumberSpan.textContent = "-";
  totalAmountSpan.textContent = "-";
  currentAnalysisFileName.textContent = "-";
  currentPdfTextForAnalysis = ""; // Clear PDF text for analysis
  pdfRawTextPreview.value = ""; // Clear the text area
  updateTemplateTabButtonsState();
}

/**
 * Clears all data from the extracted results table.
 */
function clearAllResults() {
  allExtractedData = [];
  extractedResultsTableBody.innerHTML =
    '<tr><td colspan="7" class="text-center">No documents processed yet.</td></tr>';
  updateProcessTabButtonsState(); // Update download button status
}

/**
 * Resets the entire UI of the Invoice Converter application.
 */
function resetUI() {
  uploadedFiles = [];
  // Reset the file input itself to allow re-uploading the same file
  pdfUpload.value = "";
  updateInvoiceFileDisplay(); // Clear uploaded files display
  currentPdfTextForAnalysis = "";
  resetExtractedFieldsForAnalysisTab(); // Reset analysis tab fields
  resetConfigInputFields(); // Reset template editor fields
  processingStatus.textContent = ""; // Clear processing status
  populateConfigSelect(); // Reload config dropdown from local storage
  hideConfirmationModal(); // Hide the confirmation modal (API key modal hidden by utils.js)
  clearAllResults(); // Clear extracted results table
  switchTab("Process"); // Go back to Process tab
  updateTemplateTabButtonsState();
  updateProcessTabButtonsState();
}

/**
 * Updates the disabled state of buttons in the "Process" tab based on current data.
 */
function updateProcessTabButtonsState() {
  const hasUploadedFiles = uploadedFiles.length > 0;
  const hasExtractedData = allExtractedData.length > 0;

  processPdfButton.disabled = !hasUploadedFiles; // Enable if files are uploaded
  downloadCsvButton.disabled = !hasExtractedData; // Enable if data is extracted
}

/**
 * Updates the disabled state of buttons in the "Template" tab based on PDF loaded.
 */
function updateTemplateTabButtonsState() {
  const isPdfLoadedForAnalysis = currentPdfTextForAnalysis.length > 0;
  const hasConfigName = configNameInput.value.trim().length > 0;
  const isConfigSelected = configSelect.value !== ""; // Check if a template is selected in dropdown

  // Preview button enabled if PDF loaded
  previewButton.disabled = !isPdfLoadedForAnalysis;

  // Save Template button enabled if config name provided
  saveTemplateButton.disabled = !hasConfigName;

  // Delete Template button enabled if a config is selected
  deleteTemplateButton.disabled = !isConfigSelected;

  // AI suggest buttons enabled if PDF loaded
  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = !isPdfLoadedForAnalysis;
  });
}

/**
 * Switches between the "Process" and "Template" tabs.
 * @param {string} tabName - The name of the tab to switch to ("Process" or "Template").
 */
function switchTab(tabName) {
  if (tabName === "Process") {
    tabButtonProcess.classList.add("tab-active");
    tabButtonProcess.classList.remove("tab-button-inactive");
    tabButtonTemplate.classList.add("tab-button-inactive");
    tabButtonTemplate.classList.remove("tab-active");
    tabContentProcess.classList.remove("hidden");
    tabContentTemplate.classList.add("hidden");
    // Ensure process tab buttons are updated when switching
    updateProcessTabButtonsState();
  } else if (tabName === "Template") {
    tabButtonTemplate.classList.add("tab-active");
    tabButtonTemplate.classList.remove("tab-button-inactive");
    tabButtonProcess.classList.add("tab-button-inactive");
    tabButtonProcess.classList.remove("tab-active");
    tabContentTemplate.classList.remove("hidden");
    tabContentProcess.classList.add("hidden");
    // Ensure template tab buttons are updated when switching
    updateTemplateTabButtonsState();
    // Reset extracted fields display and raw text when entering template tab
    resetExtractedFieldsForAnalysisTab();
    // If there are uploaded files, automatically load the first one for analysis
    if (!currentPdfTextForAnalysis && uploadedFiles.length > 0) {
      displayPdfTextForAnalysis(uploadedFiles[0]);
    }
  }
}

// --- 7. Main Initialization (DOMContentLoaded) ---

document.addEventListener("DOMContentLoaded", async () => {
  // Initial UI setup
  switchTab("Process"); // Start on the Process tab
  updateInvoiceFileDisplay();
  updateTemplateTabButtonsState(); // Set initial button states
  updateProcessTabButtonsState();

  // Load configurations from local storage on startup
  loadLocalConfigurations();

  // --- Event Listeners for UI Interactions ---

  // Tab switching
  tabButtonProcess.addEventListener("click", () => switchTab("Process"));
  tabButtonTemplate.addEventListener("click", () => switchTab("Template"));

  // PDF Upload and Display
  // Use handleFiles function directly
  pdfUpload.addEventListener("change", (event) =>
    handleFiles(event.target.files)
  );
  // Clear all files logic moved to resetUI, which clearUploadFormButton will now call
  clearUploadFormButton.addEventListener("click", resetUI);

  // Drag and drop events for PDF upload area
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("border-primary", "bg-primary", "bg-opacity-10");
  });
  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("border-primary", "bg-primary", "bg-opacity-10");
  });
  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("border-primary", "bg-primary", "bg-opacity-10");
    handleFiles(e.dataTransfer.files); // Call the new handleFiles function
  });

  // Process PDF button click handler
  processPdfButton.addEventListener("click", async () => {
    if (uploadedFiles.length === 0) {
      showNoDocumentSelectedModal();
      return;
    }

    clearAllResults(); // Clear previous results
    // Display processing message in table
    extractedResultsTableBody.innerHTML =
      '<tr><td colspan="7" class="text-center">Processing...</td></tr>';
    processingStatus.textContent = `Processing 0/${uploadedFiles.length} PDFs...`;
    updateProcessTabButtonsState();

    let processedCount = 0;
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file.type !== "application/pdf") {
        continue; // Skip non-PDF files
      }

      processingStatus.textContent = `Processing "${file.name}" (${
        processedCount + 1
      }/${uploadedFiles.length})...`;

      const reader = new FileReader();
      const fileReadPromise = new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          const pdfData = new Uint8Array(e.target.result);
          try {
            const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
            let fullText = "";
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
              const currentPage = await pdf.getPage(pageNum);
              const textContent = await currentPage.getTextContent();
              fullText +=
                textContent.items.map((item) => item.str).join(" ") + "\n";
            }
            resolve(fullText); // Resolve with extracted text
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

        // Attempt to classify document if local templates are available
        if (localConfigurations.length > 0) {
          processingStatus.textContent = `Identifying best template for "${file.name}"...`;
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

        processingStatus.textContent = `Extracting data from "${file.name}"...`;
        logDebug(
          `Calling regex-based extraction for "${file.name}" with template: ${
            selectedConfigForExtraction
              ? selectedConfigForExtraction.name
              : "None"
          }`
        );
        // Use direct regex extraction for processing (no AI, faster and uses user templates)
        extractedData = await callGeminiApi(
          fileText,
          selectedConfigForExtraction,
          false,
          false,
          false // Do not use LLM for the actual extraction logic here, use regex
        );

        // Format and store extracted data
        const formattedExtractedData = {
          originalFile: file,
          fileName: file.name,
          configUsedName: configUsedName,
          extractedSupplierName: extractedData.supplierName || "-",
          officialSupplierNameForExport: officialSupplierNameForExport,
          // Ensure documentDate is stored as DD/MM/YYYY
          documentDate: extractedData.documentDate
            ? formatDateForDisplay(extractedData.documentDate) // Use utility function
            : "-",
          documentNumber: extractedData.documentNumber || "-",
          totalAmount: extractedData.totalAmount || null,
        };
        allExtractedData.push(formattedExtractedData);
      } catch (error) {
        // Log error and store error data for display
        console.error(`Error processing file ${file.name}:`, error);
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
        ); // Use showMessage for error feedback
      }
      processedCount++;
    }

    // Sort all extracted data by document date in ascending order
    allExtractedData.sort((a, b) => {
      // Convert DD/MM/YYYY strings to Date objects for comparison
      // The parseDateForSorting utility expects the format DD/MM/YYYY already.
      const dateA = new Date(a.documentDate.split("/").reverse().join("-"));
      const dateB = new Date(b.documentDate.split("/").reverse().join("-"));

      // Handle invalid dates by placing them at the end or beginning
      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1; // a is invalid, so b comes first
      if (isNaN(dateB.getTime())) return -1; // b is invalid, so a comes first

      return dateA.getTime() - dateB.getTime();
    });

    refreshExtractedResultsTable(); // Redraw the table with sorted data

    processingStatus.textContent = ``; // Clear processing status text
    if (allExtractedData.length > 0) {
      showMessage(
        "success",
        `Finished processing ${processedCount} PDF(s). Data ready for download.`
      ); // Use showMessage for success
    } else {
      showMessage(
        "warning",
        `Finished processing ${processedCount} PDF(s), but no data was extracted.`
      ); // Use showMessage for warning
    }
    updateProcessTabButtonsState(); // Update button states after all files processed
  });

  // Preview button click handler in "Template" tab
  previewButton.addEventListener("click", async () => {
    if (!currentPdfTextForAnalysis) {
      showNoDocumentSelectedModal();
      return;
    }

    try {
      // Get current regexs from input fields
      const currentRegexs = {
        supplierNamePattern: supplierNameRegexInput.value,
        documentDatePattern: documentDateRegexInput.value,
        documentNumberPattern: documentNumberRegexInput.value,
        totalAmountPattern: totalAmountRegexInput.value,
      };

      // Perform extraction using current regexs (no LLM for preview)
      const refinedData = await callGeminiApi(
        currentPdfTextForAnalysis,
        currentRegexs,
        true, // This is a refinement/preview
        false,
        false // Do not use LLM for preview extraction itself
      );

      if (refinedData) {
        // Display extracted data, ensuring date is formatted as DD/MM/YYYY
        supplierNameSpan.textContent = refinedData.supplierName || "-";
        documentDateSpan.textContent = formatDateForDisplay(
          // Use utility function
          refinedData.documentDate
        );
        documentNumberSpan.textContent = refinedData.documentNumber || "-";
        totalAmountSpan.textContent = formatAmountForDisplay(
          // Use utility function
          refinedData.totalAmount
        );
        showMessage("success", "Preview complete!");
      } else {
        showMessage("warning", "No refined data extracted during preview."); // Use showMessage for feedback
      }
    } catch (error) {
      showMessage(
        "error",
        `Error during preview: ${error.message}. Check console for details.`
      ); // Use showMessage for error feedback
      console.error("Preview error:", error);
    } finally {
      updateTemplateTabButtonsState();
      updateProcessTabButtonsState();
    }
  });

  // AI Suggestion buttons for regex
  aiSuggestDateBtn.addEventListener("click", () => {
    if (currentPdfTextForAnalysis) {
      showRegexSuggestModal("documentDate");
    } else {
      showNoDocumentSelectedModal();
    }
  });
  aiSuggestNumberBtn.addEventListener("click", () => {
    if (currentPdfTextForAnalysis) {
      showRegexSuggestModal("documentNumber");
    } else {
      showNoDocumentSelectedModal();
    }
  });
  aiSuggestAmountBtn.addEventListener("click", () => {
    if (currentPdfTextForAnalysis) {
      showRegexSuggestModal("totalAmount");
    } else {
      showNoDocumentSelectedModal();
    }
  });

  generateRegexButton.addEventListener("click", generateRegexSuggestions);
  cancelRegexSuggestButton.addEventListener("click", hideRegexSuggestModal);
  useSelectedRegexButton.addEventListener("click", useSelectedRegex);

  // Configuration management buttons
  saveTemplateButton.addEventListener("click", saveTemplateToLocalStorage);
  deleteTemplateButton.addEventListener(
    "click",
    deleteTemplateFromLocalStorage
  );
  importConfigButton.addEventListener("click", importConfigsFromJson);
  exportAllConfigsButton.addEventListener("click", exportAllConfigsToJson);

  // Auto-load config when selection changes
  configSelect.addEventListener("change", autoLoadSelectedConfiguration);

  // Download CSV button
  downloadCsvButton.addEventListener("click", downloadCSVHandler);

  // Update analyze tab buttons state when config selection changes
  configSelect.addEventListener("change", () => {
    updateTemplateTabButtonsState();
  });

  // Update template tab buttons state when inputs change
  configNameInput.addEventListener("input", updateTemplateTabButtonsState);
  officialSupplierNameForExportInput.addEventListener(
    "input",
    updateTemplateTabButtonsState
  );
  supplierNameRegexInput.addEventListener(
    "input",
    updateTemplateTabButtonsState
  );
  documentDateRegexInput.addEventListener(
    "input",
    updateTemplateTabButtonsState
  );
  documentNumberRegexInput.addEventListener(
    "input",
    updateTemplateTabButtonsState
  );
  totalAmountRegexInput.addEventListener(
    "input",
    updateTemplateTabButtonsState
  );
});
