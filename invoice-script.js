// invoice-script.js

// --- 1. Firebase Imports and Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// --- IMPORTANT: REPLACE THIS WITH YOUR ACTUAL FIREBASE CONFIG ---
// Go to your Firebase project settings -> "Your apps" -> select your web app to find this.
const firebaseConfig = {
  apiKey: "AIzaSyCMXn3b0kul6cYiqqyFejFyX_6Hp0wXqY0",
  authDomain: "invoice-extractor-ec792.firebaseapp.com",
  projectId: "invoice-extractor-ec792",
  storageBucket: "invoice-extractor-ec792.firebasestorage.app",
  messagingSenderId: "532030177380",
  appId: "1:532030177380:web:aa69cfdbc842c196435f71",
  measurementId: "G-1WJ1KLDQB4",
};

// Use a static app ID for self-hosting, or generate one if truly dynamic
// For a simple client-side app, you might just use a constant string.
const appId = firebaseConfig.appId || "your-default-app-id"; // Use Firebase config's appId or a fallback

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. Global Variables and DOM Element References ---

// Main application state
let uploadedFiles = [];
let currentPdfTextForAnalysis = ""; // Stores text of the PDF currently displayed in Analyze tab
let currentUser = null; // Firebase user object
let activeConfig = null; // The currently loaded template configuration
let userConfigurations = []; // Array of saved user templates
let allExtractedData = []; // All extracted invoice data from processed PDFs
let currentRegexTargetField = null; // Field for which AI regex suggestions are being generated (e.g., 'documentDate')

// API related constants
const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
let GEMINI_API_KEY = localStorage.getItem("geminiApiKey"); // Retrieve API key from local storage

// Debugging flag
const DEBUG_MODE = true;

// DOM Element References (cached for performance)
const userIconContainer = document.getElementById("userIconContainer");
const userIcon = document.getElementById("userIcon");
const defaultUserSvg = document.getElementById("defaultUserSvg");
const pdfUpload = document.getElementById("pdfUpload");
const pdfCanvas = document.getElementById("pdfCanvas");
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
const supplierNameHintInput = document.getElementById("supplierNameHint");
const documentDateHintInput = document.getElementById("documentDateHint");
const documentNumberHintInput = document.getElementById("documentNumberHint");
const totalAmountHintInput = document.getElementById("totalAmountHint");
const saveConfigButton = document.getElementById("saveConfigButton");
const configSelect = document.getElementById("configSelect");
const loadConfigButton = document.getElementById("loadConfigButton");
const deleteConfigButton = document.getElementById("deleteConfigButton");
const previewButton = document.getElementById("previewButton");
const dropArea = document.getElementById("dropArea");
const uploadedFilesList = document.getElementById("uploadedFilesList");
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
const tabButtonAnalyze = document.getElementById("tabButtonAnalyze");
const tabContentProcess = document.getElementById("tabContentProcess");
const tabContentAnalyze = document.getElementById("tabContentAnalyze");
const aiSuggestDateBtn = document.getElementById("aiSuggestDateBtn");
const aiSuggestNumberBtn = document.getElementById("aiSuggestNumberBtn");
const aiSuggestAmountBtn = document.getElementById("aiSuggestAmountBtn");
const apiKeyModal = document.getElementById("apiKeyModal");
const apiKeyValueInput = document.getElementById("apiKeyValueInput");
const saveApiKeyButton = document.getElementById("saveApiKeyButton");
const cancelApiKeyButton = document.getElementById("cancelApiKeyButton");
const logoutModal = document.getElementById("logoutModal");
const confirmLogoutButton = document.getElementById("confirmLogoutButton");
const cancelLogoutButton = document.getElementById("cancelLogoutButton");
const logoutModalTitle = document.getElementById("logoutModalTitle");
const logoutModalText = document.getElementById("logoutModalText");
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

// --- 3. Utility Functions ---

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
 * Shows the API key input modal.
 */
function showApiKeyModal() {
  apiKeyModal.style.display = "flex";
}

/**
 * Hides the API key input modal.
 */
function hideApiKeyModal() {
  apiKeyModal.style.display = "none";
}

/**
 * Shows the logout confirmation modal.
 */
function showLogoutModal() {
  logoutModal.style.display = "flex";
}

/**
 * Hides the logout confirmation modal.
 */
function hideLogoutModal() {
  logoutModal.style.display = "none";
}

/**
 * Switches between the "Process" and "Analyze" tabs.
 * @param {string} tabId - The ID of the tab to switch to ("Process" or "Analyze").
 */
function switchTab(tabId) {
  const tabs = document.querySelectorAll(".tab-button");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    if (tab.id === `tabButton${tabId}`) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  contents.forEach((content) => {
    if (content.id === `tabContent${tabId}`) {
      content.classList.remove("hidden");
      if (tabId === "Analyze") {
        content.classList.add("flex"); // Ensure flex display for Analyze tab layout
      }
    } else {
      content.classList.add("hidden");
      if (content.id === "tabContentAnalyze") {
        content.classList.remove("flex");
      }
    }
  });

  updateAnalyzeTabButtonsState();
  updateProcessTabButtonsState();
}

/**
 * Formats an amount for display, ensuring 2 decimal places and locale-specific formatting.
 * Handles null, NaN, and error strings gracefully.
 * @param {number|string|null} amount - The amount to format.
 * @returns {string} The formatted amount string or "N/A" / "Error".
 */
function formatAmountForDisplay(amount) {
  if (
    amount === null ||
    isNaN(amount) ||
    amount === "N/A" ||
    amount === "Error" ||
    amount === undefined
  ) {
    return amount;
  }
  let parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount)) {
    return "N/A";
  }
  // Format with thousands separators and two decimal places
  return parsedAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a date string for display in DD/MM/YY format.
 * Handles various date formats (DD/MM/YYYY, YYYY-MM-DD, or general date strings).
 * @param {string} dateString - The date string to format.
 * @returns {string} The formatted date string or the original string if invalid.
 */
function formatDateForDisplay(dateString) {
  if (!dateString || dateString === "N/A" || dateString === "Error")
    return dateString;
  try {
    let date;
    // Attempt to parse DD/MM/YYYY
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const parts = dateString.split("/");
      date = new Date(parts[2], parts[1] - 1, parts[0]);
    }
    // Attempt to parse YYYY-MM-DD
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

    // Format to DD/MM/YY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2); // Get last two digits of year
    return `${day}/${month}/${year}`;
  } catch (e) {
    // If any error during parsing/formatting, return original string
    console.error("Error formatting date:", e);
    return dateString;
  }
}

/**
 * Clears all extracted results from the table and resets relevant UI states.
 */
function clearAllResults() {
  allExtractedData = []; // Clear array of extracted data
  // Reset table body to "No documents processed yet." message
  extractedResultsTableBody.innerHTML =
    '<tr><td colspan="7" class="px-6 py-4 text-center">No documents processed yet.</td></tr>';
  updateProcessTabButtonsState(); // Update process tab button states
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
    '<p id="noSuggestionsText" class="text-sm text-light-text-secondary dark:text-dark-text-secondary">Click "Generate Suggestions" to get AI help.</p>';
  useSelectedRegexButton.disabled = true;
  regexSuggestStatus.textContent = "";
  regexTestResult.textContent = "Test Result: No regex tested yet.";

  regexSuggestModal.style.display = "flex"; // Show modal
}

/**
 * Hides the regex suggestion modal.
 */
function hideRegexSuggestModal() {
  regexSuggestModal.style.display = "none";
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
      // Extract the captured group if available, otherwise the full match
      const result = match[1] ? match[1].trim() : match[0].trim();

      let cleanedResult = result;
      // Special handling for document number to remove spaces/dashes
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
    // Handle invalid regex patterns
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
      documentDateHintInput.value = selectedRegex;
    } else if (currentRegexTargetField === "documentNumber") {
      documentNumberHintInput.value = selectedRegex;
    } else if (currentRegexTargetField === "totalAmount") {
      totalAmountHintInput.value = selectedRegex;
    }
    hideRegexSuggestModal(); // Close modal
    previewButton.click(); // Trigger a preview to see the effect of the new regex
  } else {
    alert("Please select a regex suggestion first.");
  }
}

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
 * Simulates a FileList object from an array of files.
 * This is sometimes needed for compatibility with DOM APIs expecting a FileList.
 * @param {Array<File>} files - An array of File objects.
 * @returns {FileList} A FileList-like object.
 */
function FileListShim(files) {
  const dt = new DataTransfer();
  files.forEach((file) => dt.items.add(file));
  return dt.files;
}

// --- 4. Data Extraction and AI Interaction Functions ---

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
  if (useLlmsForOperation && !GEMINI_API_KEY) {
    showApiKeyModal();
    return null;
  }

  // Disable buttons during API call
  processPdfButton.disabled = true;
  previewButton.disabled = true;
  saveConfigButton.disabled = true;
  loadConfigButton.disabled = true;
  deleteConfigButton.disabled = true;
  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = true;
  });

  let prompt;
  let responseMimeType = "application/json";
  let normalizedResult = {}; // To store the parsed result

  // Logic for document classification (heuristic)
  if (classifyOnly && userConfigurations.length > 0) {
    processingStatus.textContent = "Identifying best template heuristically...";
    normalizedResult = classifyDocumentHeuristically(
      pdfText,
      userConfigurations
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
      ? "Previewing with current hints (using regex)..."
      : "Processing with saved template (using regex)...";
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
        prompt += `- Supplier Name Hint: "${config.supplierNamePattern}"\n`;
      if (config.documentDatePattern)
        prompt += `- Document Date Hint: "${config.documentDatePattern}"\n`;
      if (config.documentNumberPattern)
        prompt += `- Document Number Hint: "${config.documentNumberPattern}"\n`;
      if (config.totalAmountPattern)
        prompt += `- Total Amount Hint: "${config.totalAmountPattern}"\n`;
      prompt += "\n";
    }
    prompt += `Invoice/Receipt Text:\n\n${pdfText}\n\nJSON Output:`;
  }

  try {
    const response = await fetch(
      `${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`,
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
    processingStatus.textContent = `AI operation failed: ${error.message}`;
    // Use custom modal for alerts instead of browser alert()
    alert(
      "Error during AI operation. See console for details: " + error.message
    );
    regexSuggestStatus.textContent = `Error: ${error.message}`; // Update status in regex modal
    throw error; // Re-throw to propagate error
  } finally {
    // Ensure buttons are re-enabled after API call
    updateAnalyzeTabButtonsState();
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
 * @param {Array<Object>} userConfigurations - Array of user-defined template configurations.
 * @returns {Object} An object indicating the matched configuration name and score.
 */
function classifyDocumentHeuristically(pdfText, userConfigurations) {
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
      return false; // Invalid regex pattern
    }
  };

  for (const config of userConfigurations) {
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
  if (!currentUser || !currentPdfTextForAnalysis) {
    alert(
      "A PDF must be loaded for analysis and you must be signed in to generate regex suggestions."
    );
    return;
  }

  if (!GEMINI_API_KEY) {
    showApiKeyModal(); // Prompt for API key if missing
    generateRegexButton.disabled = false; // Re-enable button if modal shown
    updateAnalyzeTabButtonsState();
    return;
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
        '<p class="text-sm text-red-600">No regex suggestions could be generated. Try a different prompt.</p>';
      regexSuggestStatus.textContent = "No suggestions.";
    }
  } catch (error) {
    console.error("Error generating regex suggestions:", error);
    regexSuggestionsContainer.innerHTML =
      '<p class="text-sm text-red-600">Failed to get suggestions. Check console for details.</p>';
    regexSuggestStatus.textContent = "Error generating suggestions.";
  } finally {
    generateRegexButton.disabled = false; // Re-enable generate button
  }
}

// --- 5. UI Event Handlers (Specific to Invoice App) ---

/**
 * Handles the PDF file upload event, populating the `uploadedFiles` array.
 * @param {Event} event - The file input change event.
 */
function handlePdfUpload(event) {
  uploadedFiles = Array.from(event.target.files);
  updateInvoiceFileDisplay(); // Update the UI to show selected files
}

/**
 * Renders the first page of a PDF file onto the canvas for preview.
 * Also extracts all text from the PDF for analysis.
 * @param {File} file - The PDF File object to render.
 */
async function renderPdfToCanvas(file) {
  // Clear canvas and reset display if no valid file
  if (!file || file.type !== "application/pdf") {
    const context = pdfCanvas.getContext("2d");
    if (context) {
      context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    }
    currentAnalysisFileName.textContent = "N/A";
    currentPdfTextForAnalysis = "";
    return;
  }
  currentAnalysisFileName.textContent = file.name; // Display filename

  const reader = new FileReader();
  reader.onload = async (e) => {
    const pdfData = new Uint8Array(e.target.result);
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1); // Get the first page
      const viewport = page.getViewport({ scale: 1.5 }); // Set a scale for rendering
      const context = pdfCanvas.getContext("2d");

      // Set canvas dimensions to match viewport
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise; // Render page to canvas

      // Extract all text from the PDF
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const currentPage = await pdf.getPage(i);
        const textContent = await currentPage.getTextContent();
        fullText += textContent.items.map((item) => item.str).join(" ") + "\n";
      }
      currentPdfTextForAnalysis = fullText; // Store extracted text
    } catch (error) {
      // Clear canvas on error
      const context = pdfCanvas.getContext("2d");
      if (context) {
        context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      }
      alert("Error loading PDF preview: " + error.message);
      console.error("PDF Preview Error:", error);
      currentPdfTextForAnalysis = ""; // Clear text on error
    } finally {
      updateAnalyzeTabButtonsState(); // Re-enable buttons
    }
  };
  reader.readAsArrayBuffer(file); // Start reading the file
}

/**
 * Saves the current template configuration to Firestore.
 */
async function saveConfiguration() {
  if (!currentUser) {
    alert("Please sign in to save templates.");
    return;
  }

  const templateName = configNameInput.value.trim();
  if (!templateName) {
    alert("Please enter a template name.");
    return;
  }

  // Disable buttons during save operation
  saveConfigButton.disabled = true;
  loadConfigButton.disabled = true;
  deleteConfigButton.disabled = true;
  previewButton.disabled = true;

  const userConfigsCollectionRef = collection(
    db,
    `artifacts/${appId}/users/${currentUser.uid}/configurations`
  );

  const newConfig = {
    name: templateName,
    officialSupplierNameForExport:
      officialSupplierNameForExportInput.value.trim(),
    supplierNamePattern: supplierNameHintInput.value,
    documentDatePattern: documentDateHintInput.value,
    documentNumberPattern: documentNumberHintInput.value,
    totalAmountPattern: totalAmountHintInput.value,
    createdAt: new Date(),
  };

  try {
    // Check if a template with the same name already exists for the user
    const q = query(
      userConfigsCollectionRef,
      where("name", "==", templateName)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // If exists, update it
      const configDoc = querySnapshot.docs[0];
      await updateDoc(doc(userConfigsCollectionRef, configDoc.id), newConfig);
      alert("Template updated successfully!");
    } else {
      // Otherwise, add a new document
      await addDoc(userConfigsCollectionRef, newConfig);
      alert("Template saved successfully!");
    }
    await loadUserConfigurations(currentUser.uid); // Reload configurations after saving
  } catch (error) {
    alert("Failed to save template: " + error.message);
    console.error("Save config error:", error);
  } finally {
    updateAnalyzeTabButtonsState(); // Re-enable buttons
    updateProcessTabButtonsState();
  }
}

/**
 * Loads user-specific template configurations from Firestore and populates the dropdown.
 * @param {string} uid - The current user's UID.
 */
async function loadUserConfigurations(uid) {
  // Clear existing options and set a default
  configSelect.innerHTML = '<option value="">-- Select a template --</option>';
  userConfigurations = []; // Clear current configurations

  try {
    const userConfigsCollectionRef = collection(
      db,
      `artifacts/${appId}/users/${uid}/configurations`
    );
    const q = query(userConfigsCollectionRef);
    const querySnapshot = await getDocs(q); // Fetch documents

    if (querySnapshot.empty) {
      configSelect.innerHTML =
        '<option value="">-- No templates saved --</option>';
      return;
    }

    // Populate userConfigurations array and the select dropdown
    querySnapshot.forEach((doc) => {
      const config = { id: doc.id, ...doc.data() };
      userConfigurations.push(config);
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = config.name;
      configSelect.appendChild(option);
    });
  } catch (error) {
    alert("Failed to load templates: " + error.message);
    console.error("Load config error:", error);
  } finally {
    updateAnalyzeTabButtonsState(); // Re-enable buttons
    updateProcessTabButtonsState();
  }
}

/**
 * Loads the currently selected configuration from the dropdown into the input fields.
 */
async function loadSelectedConfiguration() {
  const selectedConfigId = configSelect.value;
  if (!selectedConfigId) {
    alert("Please select a template to load.");
    return;
  }
  if (!currentUser) {
    alert("Please sign in to load templates.");
    return;
  }

  // Disable buttons during load operation
  saveConfigButton.disabled = true;
  loadConfigButton.disabled = true;
  deleteConfigButton.disabled = true;
  previewButton.disabled = true;

  try {
    const configDocRef = doc(
      db,
      `artifacts/${appId}/users/${currentUser.uid}/configurations`,
      selectedConfigId
    );
    const configSnap = await getDoc(configDocRef); // Get document snapshot

    if (configSnap.exists()) {
      activeConfig = { id: configSnap.id, ...configSnap.data() }; // Set active config
      // Populate input fields with loaded data
      configNameInput.value = activeConfig.name;
      officialSupplierNameForExportInput.value =
        activeConfig.officialSupplierNameForExport || "";
      supplierNameHintInput.value = activeConfig.supplierNamePattern || "";
      documentDateHintInput.value = activeConfig.documentDatePattern || "";
      documentNumberHintInput.value = activeConfig.documentNumberPattern || "";
      totalAmountHintInput.value = activeConfig.totalAmountPattern || "";
    } else {
      alert("Selected template not found or you don't have access.");
      activeConfig = null; // Clear active config
    }
  } catch (error) {
    alert("Failed to load selected template: " + error.message);
    console.error("Load selected config error:", error);
  } finally {
    updateAnalyzeTabButtonsState(); // Re-enable buttons
    updateProcessTabButtonsState();
  }
}

/**
 * Deletes the currently selected configuration from Firestore after confirmation.
 */
async function deleteSelectedConfiguration() {
  const selectedConfigId = configSelect.value;
  if (!selectedConfigId) {
    alert("Please select a template to delete.");
    return;
  }
  if (!currentUser) {
    alert("Please sign in to delete templates.");
    return;
  }

  // Show a confirmation modal (reusing logout modal for generic confirmation)
  showLogoutModal();
  logoutModalTitle.textContent = "Delete Template?";
  logoutModalText.textContent =
    "Are you sure you want to delete this template?";
  confirmLogoutButton.textContent = "Delete";

  // Set up event listeners for confirmation modal
  confirmLogoutButton.onclick = async () => {
    hideLogoutModal(); // Hide modal
    confirmLogoutButton.onclick = null; // Clear handler to prevent re-triggering

    // Disable buttons during delete operation
    saveConfigButton.disabled = true;
    loadConfigButton.disabled = true;
    deleteConfigButton.disabled = true;
    previewButton.disabled = true;

    try {
      const configDocRef = doc(
        db,
        `artifacts/${appId}/users/${currentUser.uid}/configurations`,
        selectedConfigId
      );
      const configSnap = await getDoc(configDocRef);

      if (configSnap.exists()) {
        await deleteDoc(configDocRef); // Delete document
        alert("Template deleted successfully!");
        await loadUserConfigurations(currentUser.uid); // Reload configurations
        resetConfigInputFields(); // Clear input fields
      } else {
        alert("Template not found or you don't have permission to delete it.");
      }
    } catch (error) {
      alert("Failed to delete template: " + error.message);
      console.error("Delete config error:", error);
    } finally {
      updateAnalyzeTabButtonsState(); // Re-enable buttons
      updateProcessTabButtonsState();
    }
  };

  cancelLogoutButton.onclick = () => {
    hideLogoutModal(); // Hide modal
    cancelLogoutButton.onclick = null; // Clear handler
    updateAnalyzeTabButtonsState(); // Re-enable buttons
    updateProcessTabButtonsState();
  };
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
  const uploadLabel = document.getElementById("upload-label-invoice");
  const fileInfo = document.getElementById("file-info-invoice");
  const fileList = document.getElementById("uploadedFilesList");

  if (uploadedFiles.length === 0) {
    uploadLabel.classList.remove("hidden");
    fileInfo.classList.add("hidden");
    fileList.innerHTML = "";
  } else {
    uploadLabel.classList.add("hidden");
    fileInfo.classList.remove("hidden");
    fileList.innerHTML = ""; // Clear existing pills

    uploadedFiles.forEach((file, index) => {
      const filePill = document.createElement("div");
      filePill.className = "file-pill";
      filePill.innerHTML = `
                <span>${file.name}</span>
                <button data-index="${index}" class="remove-button"> &times; </button>
            `;
      fileList.appendChild(filePill);
    });
  }
  processingStatus.textContent = `${uploadedFiles.length} file(s) selected. Click Process PDF(s).`;
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

  // Insert new row at the top (index 0)
  const newRow = tableBody.insertRow(0);
  newRow.setAttribute("data-index", index);
  newRow.className = "hover:bg-gray-50 dark:hover:bg-gray-700";

  // Populate row cells with data
  newRow.innerHTML = `
      <td class="px-6 py-4 text-sm break-words max-w-[150px] overflow-hidden">${
        data.fileName
      }</td>
      <td class="px-6 py-4 text-xs">${data.configUsedName || "N/A"}</td>
      <td class="px-6 py-4 text-sm">${
        data.officialSupplierNameForExport ||
        data.extractedSupplierName ||
        "N/A"
      }</td>
      <td class="px-6 py-4 text-sm">${formatDateForDisplay(
        data.documentDate
      )}</td>
      <td class="px-6 py-4 text-sm">${data.documentNumber || "N/A"}</td>
      <td class="px-6 py-4 text-sm">${formatAmountForDisplay(
        data.totalAmount
      )}</td>
      <td class="px-6 py-4">
          <button data-index="${index}" class="analyze-row-button bg-blue-500 text-white p-2 rounded-md hover:bg-blue-700 flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
      </td>
  `;

  // Add event listener to "Analyze" button in the row
  newRow
    .querySelector(".analyze-row-button")
    .addEventListener("click", async (e) => {
      const clickedIndex = parseInt(e.target.closest("button").dataset.index);
      const dataToAnalyze = allExtractedData[clickedIndex];
      const fileToAnalyze = allExtractedData[clickedIndex].originalFile;

      switchTab("Analyze"); // Switch to Analyze tab

      await renderPdfToCanvas(fileToAnalyze); // Render PDF for analysis

      // Populate extracted information display
      supplierNameSpan.textContent =
        dataToAnalyze.extractedSupplierName || "N/A";
      documentDateSpan.textContent = formatDateForDisplay(
        dataToAnalyze.documentDate
      );
      documentNumberSpan.textContent = dataToAnalyze.documentNumber || "N/A";
      totalAmountSpan.textContent = formatAmountForDisplay(
        dataToAnalyze.totalAmount
      );

      // If a configuration was used, try to load it into the template editor
      if (
        dataToAnalyze.configUsedName &&
        dataToAnalyze.configUsedName !== "None (Best Guess)"
      ) {
        const foundConfig = userConfigurations.find(
          (cfg) => cfg.name === dataToAnalyze.configUsedName
        );
        if (foundConfig) {
          configSelect.value = foundConfig.id; // Select in dropdown
          await loadSelectedConfiguration(); // Load details into inputs
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

      updateAnalyzeTabButtonsState();
    });
}

/**
 * Downloads all extracted data as a CSV file.
 */
function downloadCSV() {
  if (allExtractedData.length === 0) {
    alert("No data to export to CSV.");
    return;
  }

  const headers = [
    "Supplier Name",
    "Document Date",
    "Document Number",
    "Total Amount",
  ];
  const csvRows = [headers.join(",")]; // CSV header row

  for (const data of allExtractedData) {
    const formattedDate = formatDateForDisplay(data.documentDate);
    const formattedAmount = (
      formatAmountForDisplay(data.totalAmount) || ""
    ).replace(/,/g, ""); // Remove commas for raw number in CSV

    // Helper to escape CSV values
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return "";
      let stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes("\n") ||
        stringValue.includes('"')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Push formatted row to CSV rows
    csvRows.push(
      [
        escapeCsv(
          data.officialSupplierNameForExport || data.extractedSupplierName
        ),
        escapeCsv(formattedDate),
        escapeCsv(data.documentNumber),
        escapeCsv(formattedAmount),
      ].join(",")
    );
  }

  const csvString = csvRows.join("\n"); // Join all rows
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", "invoices.csv");
  link.style.visibility = "hidden"; // Hide the link
  document.body.appendChild(link);
  link.click(); // Trigger download
  document.body.removeChild(link); // Clean up
  URL.revokeObjectURL(url); // Release object URL
}

// --- 6. UI State Management and Reset Functions ---

/**
 * Resets all input fields in the "Template" editor tab.
 */
function resetConfigInputFields() {
  configNameInput.value = "";
  officialSupplierNameForExportInput.value = "";
  supplierNameHintInput.value = "";
  documentDateHintInput.value = "";
  documentNumberHintInput.value = "";
  totalAmountHintInput.value = "";
  activeConfig = null; // Clear active config
  updateAnalyzeTabButtonsState();
}

/**
 * Resets the displayed extracted fields and PDF preview in the "Analyze" tab.
 */
function resetExtractedFieldsForAnalysisTab() {
  supplierNameSpan.textContent = "N/A";
  documentDateSpan.textContent = "N/A";
  documentNumberSpan.textContent = "N/A";
  totalAmountSpan.textContent = "N/A";
  currentAnalysisFileName.textContent = "N/A";
  currentPdfTextForAnalysis = ""; // Clear PDF text for analysis

  // Clear PDF canvas
  const context = pdfCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
  }
  updateAnalyzeTabButtonsState();
}

/**
 * Resets the entire UI of the Invoice Converter application.
 */
function resetUI() {
  // Clear PDF canvas
  const context = pdfCanvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
  }
  uploadedFiles = [];
  updateInvoiceFileDisplay(); // Clear uploaded files display
  currentPdfTextForAnalysis = "";
  resetExtractedFieldsForAnalysisTab(); // Reset analysis tab fields
  resetConfigInputFields(); // Reset template editor fields
  processingStatus.textContent = ""; // Clear processing status
  clearConfigSelect(); // Clear template dropdown
  hideApiKeyModal();
  hideLogoutModal();
  clearAllResults(); // Clear extracted results table
  switchTab("Process"); // Go back to Process tab
  updateAnalyzeTabButtonsState();
  updateProcessTabButtonsState();
}

/**
 * Clears the file input form, effectively removing selected files.
 */
function clearUploadForm() {
  uploadedFiles = [];
  pdfUpload.value = ""; // Resets the file input itself
  updateInvoiceFileDisplay();
}

/**
 * Clears all options in the configuration select dropdown.
 */
function clearConfigSelect() {
  configSelect.innerHTML = '<option value="">-- No templates saved --</option>';
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
 * Updates the disabled state of buttons in the "Analyze" tab based on user login and PDF loaded.
 */
function updateAnalyzeTabButtonsState() {
  const isUserLoggedIn = currentUser !== null;
  const isPdfLoadedForAnalysis = currentPdfTextForAnalysis.length > 0;
  const hasConfigName = configNameInput.value.trim().length > 0;
  const isConfigSelected = configSelect.value !== "";

  // Preview button enabled if user logged in and PDF loaded
  previewButton.disabled = !(isUserLoggedIn && isPdfLoadedForAnalysis);

  // Save config button enabled if user logged in and config name provided
  saveConfigButton.disabled = !(isUserLoggedIn && hasConfigName);

  // Load config button enabled if user logged in and config is selected
  loadConfigButton.disabled = !(isUserLoggedIn && isConfigSelected);

  // Delete config button enabled if user logged in and config is selected
  deleteConfigButton.disabled = !(isUserLoggedIn && isConfigSelected);

  // AI suggest buttons enabled if user logged in and PDF loaded
  document.querySelectorAll(".ai-suggest-button").forEach((btn) => {
    btn.disabled = !(isUserLoggedIn && isPdfLoadedForAnalysis);
  });
}

// --- 7. Main Initialization (DOMContentLoaded) ---

document.addEventListener("DOMContentLoaded", async () => {
  // Apply theme preference
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
  applyTheme(prefersDarkMode.matches);
  prefersDarkMode.addEventListener("change", (e) => applyTheme(e.matches));

  // Firebase Authentication
  onAuthStateChanged(auth, async (user) => {
    currentUser = user; // Update global currentUser
    if (user) {
      logDebug(`User logged in: ${user.uid}`);
      // Display user photo or default SVG
      if (user.photoURL) {
        userIcon.src = user.photoURL;
        userIcon.classList.remove("hidden");
        userIconContainer.classList.remove("default-icon");
        defaultUserSvg.classList.add("hidden");
      } else {
        userIcon.classList.add("hidden");
        userIconContainer.classList.add("default-icon");
        defaultUserSvg.classList.remove("hidden");
      }
      // Only load user configurations if the user is authenticated (not anonymous)
      if (!user.isAnonymous) {
        await loadUserConfigurations(user.uid); // Load user's saved templates
      } else {
        logDebug("Anonymous user detected. Template saving/loading disabled.");
        configSelect.innerHTML =
          '<option value="">-- Sign in to save/load templates --</option>';
      }
    } else {
      logDebug("User logged out or not authenticated.");
      // Show default user icon
      userIcon.classList.add("hidden");
      userIconContainer.classList.add("default-icon");
      defaultUserSvg.classList.remove("hidden");
      resetUI(); // Reset UI on logout
    }
    updateAnalyzeTabButtonsState(); // Update button states
    updateProcessTabButtonsState();
  });

  // Initial Firebase sign-in for self-hosting: sign in anonymously
  // This ensures a user ID is available for Firestore rules that rely on `request.auth.uid`.
  try {
    await signInAnonymously(auth);
    logDebug("Signed in anonymously for self-hosting.");
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    alert(
      "Failed to initialize Firebase authentication. Features requiring sign-in will not work."
    );
  }

  // --- Event Listeners for UI Interactions ---

  // Tab switching
  tabButtonProcess.addEventListener("click", () => switchTab("Process"));
  tabButtonAnalyze.addEventListener("click", () => switchTab("Analyze"));

  // API Key modal buttons
  saveApiKeyButton.addEventListener("click", () => {
    const enteredKey = apiKeyValueInput.value.trim();
    if (enteredKey) {
      localStorage.setItem("geminiApiKey", enteredKey);
      GEMINI_API_KEY = enteredKey;
      hideApiKeyModal();
    } else {
      alert("Please enter a valid Gemini API Key.");
    }
  });
  cancelApiKeyButton.addEventListener("click", () => {
    hideApiKeyModal();
    updateAnalyzeTabButtonsState(); // Re-enable buttons if API key was mandatory
  });

  // User icon / Authentication
  userIconContainer.addEventListener("click", async () => {
    if (currentUser && !currentUser.isAnonymous) {
      // If a non-anonymous user is signed in
      showLogoutModal(); // Show logout confirmation
      // Customize modal content for logout
      logoutModalTitle.textContent = "Sign Out?";
      logoutModalText.textContent = "Are you sure you want to sign out?";
      confirmLogoutButton.textContent = "Sign Out";

      confirmLogoutButton.onclick = async () => {
        hideLogoutModal();
        try {
          await signOut(auth); // Firebase sign out
          logDebug("User signed out.");
        } catch (error) {
          alert("Error signing out: " + error.message);
          console.error("Sign out error:", error);
        } finally {
          // Clean up click handlers
          confirmLogoutButton.onclick = null;
          cancelLogoutButton.onclick = null;
        }
      };
      cancelLogoutButton.onclick = () => {
        hideLogoutModal();
        // Clean up click handlers
        confirmLogoutButton.onclick = null;
        cancelLogoutButton.onclick = null;
      };
    } else {
      // If no user, or anonymous user is signed in, initiate Google Sign-In
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
        logDebug("Google Sign-In successful.");
      } catch (error) {
        alert("Error signing in: " + error.message);
        console.error("Google Sign-In error:", error);
      }
    }
  });

  // PDF Upload and Display
  pdfUpload.addEventListener("change", handlePdfUpload);
  clearUploadFormButton.addEventListener("click", clearUploadForm);

  // Delegated event listener for removing individual file pills
  uploadedFilesList.addEventListener("click", (e) => {
    if (e.target.matches(".remove-button")) {
      const indexToRemove = parseInt(e.target.dataset.index, 10);
      uploadedFiles.splice(indexToRemove, 1);

      // Update the file input's internal file list for consistency (important for re-uploading same file)
      const dataTransfer = new DataTransfer();
      uploadedFiles.forEach((file) => dataTransfer.items.add(file));
      pdfUpload.files = dataTransfer.files;

      updateInvoiceFileDisplay();
    }
  });

  // Drag and drop events for PDF upload area
  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.classList.add("highlight"); // Add visual highlight
  });
  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("highlight"); // Remove highlight
  });
  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.classList.remove("highlight");
    const files = e.dataTransfer.files; // Get dropped files
    const dataTransfer = new DataTransfer();
    for (let i = 0; i < files.length; i++) {
      dataTransfer.items.add(files[i]);
    }
    pdfUpload.files = dataTransfer.files; // Assign to file input
    pdfUpload.dispatchEvent(new Event("change", { bubbles: true })); // Trigger change event
  });

  // Process PDF button click handler
  processPdfButton.addEventListener("click", async () => {
    if (uploadedFiles.length === 0) {
      alert("Please select PDF file(s) first.");
      return;
    }
    if (!currentUser) {
      alert("Please sign in to process PDFs.");
      return;
    }

    clearAllResults(); // Clear previous results
    // Display processing message in table
    extractedResultsTableBody.innerHTML =
      '<tr><td colspan="7" class="px-6 py-4 text-center">Processing...</td></tr>';
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
        let configUsedName = "None (Best Guess)";
        let selectedConfigForExtraction = null;
        let officialSupplierNameForExport = null;

        // Attempt to classify document if user has saved templates AND is not anonymous
        if (userConfigurations.length > 0 && !currentUser.isAnonymous) {
          processingStatus.textContent = `Identifying best template for "${file.name}"...`;
          const classificationResult = classifyDocumentHeuristically(
            fileText,
            userConfigurations
          );

          if (
            classificationResult &&
            classificationResult.matchedConfigName &&
            classificationResult.matchedConfigName !== "None"
          ) {
            const matchedName = classificationResult.matchedConfigName;
            const foundConfig = userConfigurations.find(
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
        // Use direct regex extraction for processing (not AI, faster and uses user templates)
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
          extractedSupplierName: extractedData.supplierName || "N/A",
          officialSupplierNameForExport: officialSupplierNameForExport,
          documentDate: extractedData.documentDate || "N/A",
          documentNumber: extractedData.documentNumber || "N/A",
          totalAmount: extractedData.totalAmount || null,
        };
        allExtractedData.push(formattedExtractedData);
        appendExtractedResultToTable(
          formattedExtractedData,
          allExtractedData.length - 1
        );
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
        appendExtractedResultToTable(errorData, allExtractedData.length - 1);
      }
      processedCount++;
    }

    processingStatus.textContent = `Finished processing ${processedCount} PDF(s).`;
    updateProcessTabButtonsState(); // Update button states after all files processed
  });

  // Preview button click handler in "Analyze" tab
  previewButton.addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please sign in to preview.");
      return;
    }
    if (!currentPdfTextForAnalysis) {
      alert(
        "No document selected for analysis. Please select a document from the 'Extract' tab first."
      );
      return;
    }

    try {
      // Get current regex hints from input fields
      const currentHints = {
        supplierNamePattern: supplierNameHintInput.value,
        documentDatePattern: documentDateHintInput.value,
        documentNumberPattern: documentNumberHintInput.value,
        totalAmountPattern: totalAmountHintInput.value,
      };

      // Perform extraction using current hints (direct regex, no LLM for preview)
      const refinedData = await callGeminiApi(
        currentPdfTextForAnalysis,
        currentHints,
        true, // This is a refinement/preview
        false,
        false // Do not use LLM for preview extraction itself
      );

      if (refinedData) {
        // Display extracted data
        supplierNameSpan.textContent = refinedData.supplierName || "N/A";
        documentDateSpan.textContent = formatDateForDisplay(
          refinedData.documentDate
        );
        documentNumberSpan.textContent = refinedData.documentNumber || "N/A";
        totalAmountSpan.textContent = formatAmountForDisplay(
          refinedData.totalAmount
        );
      } else {
        alert("No refined data extracted during preview.");
      }
    } catch (error) {
      alert(
        "Error during preview. Check console for details: " + error.message
      );
      console.error("Preview error:", error);
    } finally {
      updateAnalyzeTabButtonsState();
      updateProcessTabButtonsState();
    }
  });

  // AI Suggestion buttons for regex
  aiSuggestDateBtn.addEventListener("click", () => {
    if (!GEMINI_API_KEY) {
      showApiKeyModal();
    } else {
      showRegexSuggestModal("documentDate");
    }
  });
  aiSuggestNumberBtn.addEventListener("click", () => {
    if (!GEMINI_API_KEY) {
      showApiKeyModal();
    } else {
      showRegexSuggestModal("documentNumber");
    }
  });
  aiSuggestAmountBtn.addEventListener("click", () => {
    if (!GEMINI_API_KEY) {
      showApiKeyModal();
    } else {
      showRegexSuggestModal("totalAmount");
    }
  });

  // Regex suggestion modal buttons
  generateRegexButton.addEventListener("click", generateRegexSuggestions);
  cancelRegexSuggestButton.addEventListener("click", hideRegexSuggestModal);
  useSelectedRegexButton.addEventListener("click", useSelectedRegex);

  // Configuration management buttons
  saveConfigButton.addEventListener("click", saveConfiguration);
  loadConfigButton.addEventListener("click", loadSelectedConfiguration);
  deleteConfigButton.addEventListener("click", deleteSelectedConfiguration);

  // Download CSV button
  downloadCsvButton.addEventListener("click", downloadCSV);

  // Update analyze tab buttons state when config selection changes
  configSelect.addEventListener("change", () => {
    updateAnalyzeTabButtonsState();
  });

  // Initial UI setup
  switchTab("Process"); // Start on the Process tab
  updateAnalyzeTabButtonsState(); // Set initial button states
  updateProcessTabButtonsState();
});
