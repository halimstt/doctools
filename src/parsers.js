import { parseDateForSorting } from "./utils";

export function parseMaybankWebDate(dateString) {
    const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const parts = dateString.split(" ");
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    return new Date("Invalid Date");
}

export async function peekDatesFromPdf(pdf, onStatusUpdate = () => { }) {
    let earliestDate = null;
    let latestDate = null;

    const dateParsers = [
        {
            regex: /(\d{1,2}\s+\w{3}\s+\d{4})/g,
            parser: parseMaybankWebDate,
        },
        {
            regex: /(\d{2}\/\d{2}\/\d{2}(?:\d{2})?)/g,
            parser: (dateStr) => {
                const timestamp = parseDateForSorting(dateStr);
                return isNaN(timestamp)
                    ? new Date("Invalid Date")
                    : new Date(timestamp);
            },
        },
    ];

    const pagesToCheck = new Set();
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        pagesToCheck.add(i);
    }
    if (pdf.numPages > 3) {
        for (let i = Math.max(1, pdf.numPages - 2); i <= pdf.numPages; i++) {
            pagesToCheck.add(i);
        }
    }

    for (const pageNum of Array.from(pagesToCheck).sort((a, b) => a - b)) {
        try {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(" ");

            for (const { regex, parser } of dateParsers) {
                let match;
                regex.lastIndex = 0;
                while ((match = regex.exec(pageText)) !== null) {
                    const dateStr = match[1];
                    const parsedDate = parser(dateStr);
                    if (!isNaN(parsedDate.getTime())) {
                        const timestamp = parsedDate.getTime();
                        if (earliestDate === null || timestamp < earliestDate) {
                            earliestDate = timestamp;
                        }
                        if (latestDate === null || timestamp > latestDate) {
                            latestDate = timestamp;
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`Error peeking page ${pageNum} for dates:`, error);
        }
    }
    return { earliestDate, latestDate };
}

export async function extractTextLinesFromPdfMaybankPdf(pdf) {
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

export function parseTransactionsMaybankPdf(allLinesFromPdf) {
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

export async function getHighAccuracyTextFromPdfMaybankWeb(pdf) {
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

export function parseTextAndGenerateCsvMaybankWeb(text) {
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
        const dateObj = parseMaybankWebDate(t.date);
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

// Invoice Parsing Logic

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
        extracted.documentDate = extractValue(pdfText, config.documentDatePattern);

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
        // Weighted scoring
        if (testPattern(pdfText, config.supplierNamePattern)) currentScore += 4;
        if (testPattern(pdfText, config.documentNumberPattern)) currentScore += 3;
        if (testPattern(pdfText, config.totalAmountPattern)) currentScore += 2;
        if (testPattern(pdfText, config.documentDatePattern)) currentScore += 1;

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

export async function generateRegexWithAI(pdfText, fieldName, userContext, apiKey) {
    if (!apiKey) throw new Error("API Key required");

    // Keep payload small
    const truncatedText = pdfText.length > 2000 ? pdfText.substring(0, 2000) : pdfText;

    const regexPrompt = `From the following document text, suggest 3-5 JavaScript-compatible regular expressions (regex) to extract the "${fieldName}" field. Provide only the regex patterns, in a JSON array format like {"regexSuggestions": ["regex1", "regex2", "regex3"]}. The regex should include a capturing group for the value if applicable.`;

    const prompt = `${regexPrompt}\n${userContext ? `Context: ${userContext}\n` : ''}Document Text: "${truncatedText}"`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) throw new Error("AI request failed");

    const data = await response.json();
    const jsonString = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!jsonString) throw new Error("Invalid AI response");

    const result = JSON.parse(jsonString);
    return result.regexSuggestions || [];
}
