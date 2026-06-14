const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

/**
 * Convert Bengali numerals (০-৯) to ASCII digits (0-9).
 * Other characters are left unchanged.
 */
function normalizeDigitsToAscii(text) {
  let s = String(text);
  for (let i = 0; i <= 9; i++) {
    s = s.split(BENGALI_DIGITS[i]).join(String(i));
  }
  return s;
}

/**
 * Extract digits from text that may use Bengali or ASCII numerals.
 * Returns a string of ASCII digits only.
 */
function extractAsciiDigits(text) {
  return normalizeDigitsToAscii(text).replace(/\D/g, '');
}

function isDigitOnlyQuery(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return false;
  return [...trimmed].every((ch) => /[0-9]/.test(ch) || /[\u09E6-\u09EF]/.test(ch));
}

/**
 * Build a regex where each digit matches either its ASCII or Bengali form.
 * e.g. "017" → [0০][1১][7৭]
 */
function buildCrossScriptDigitRegex(asciiDigits) {
  let pattern = '';
  for (const d of String(asciiDigits)) {
    const i = Number(d);
    if (Number.isNaN(i) || i < 0 || i > 9) continue;
    pattern += `[${i}${BENGALI_DIGITS[i]}]`;
  }
  return pattern;
}

function normalizeMobile(mobile) {
  let digits = extractAsciiDigits(mobile);

  // Already correct full international format
  if (digits.startsWith('880') && digits.length === 13) {
    return digits;
  }

  // Strip any leading zeros to get the raw local number
  const stripped = digits.replace(/^0+/, '');

  // Expect 10 significant digits for BD numbers (1[3-9]XXXXXXXX)
  if (/^1[3-9]\d{8}$/.test(stripped)) {
    return `880${stripped}`;
  }

  return digits;
}

function isValidBangladeshMobile(mobile) {
  const normalized = normalizeMobile(mobile);
  return /^8801[3-9]\d{8}$/.test(normalized);
}

function formatMobileForDisplay(mobile) {
  const normalized = normalizeMobile(mobile);
  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }
  return String(mobile).replace(/^0+/, '0');
}

module.exports = {
  normalizeMobile,
  isValidBangladeshMobile,
  formatMobileForDisplay,
  normalizeDigitsToAscii,
  extractAsciiDigits,
  buildCrossScriptDigitRegex,
  isDigitOnlyQuery,
};
