/**
 * Sanitizes text for PDF generation to prevent encoding issues.
 * - Replaces smart quotes with straight quotes.
 * - Removes emojis and other non-standard unicode characters that jsPDF's default fonts don't support.
 * - Normalizes whitespace.
 * 
 * @param {string} text - The text to sanitize
 * @returns {string} - The sanitized text
 */
export const sanitizeText = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/[\u2018\u2019]/g, "'") // Left/Right single quotes
        .replace(/[\u201C\u201D]/g, '"') // Left/Right double quotes
        .replace(/\u2026/g, "...")       // Ellipsis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alport
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
        .replace(/[^\x20-\x7E\n\r\t]/g, '')     // Optional: Remove anything else non-ASCII if strict mode is needed. Keeping it simple for now to likely cover most issues.
        .trim();
};
