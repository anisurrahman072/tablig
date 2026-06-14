const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

function normalizeDigitsToAscii(text: string): string {
  let s = text;
  for (let i = 0; i <= 9; i++) {
    s = s.split(BENGALI_DIGITS[i]).join(String(i));
  }
  return s;
}

function extractAsciiDigits(text: string): string {
  return normalizeDigitsToAscii(text).replace(/\D/g, '');
}

function normalizeMobileLocal(mobile: string): string {
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

/**
 * Converts any stored BD mobile format to user-friendly display (01XXXXXXXXX).
 */
export function displayMobile(mobile: string | undefined | null): string {
  if (!mobile) return '—';
  const normalized = normalizeMobileLocal(mobile);
  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }
  // Fallback: strip leading zeros from whatever is stored
  return mobile.replace(/^0+/, '0');
}

/** BD mobile in 8801XXXXXXXXX form for tel/sms/whatsapp links. */
export function mobileForDial(mobile: string | undefined | null): string | null {
  if (!mobile) return null;
  const normalized = normalizeMobileLocal(mobile);
  return /^8801[3-9]\d{8}$/.test(normalized) ? normalized : null;
}
