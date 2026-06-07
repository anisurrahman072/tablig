function normalizeMobileLocal(mobile: string): string {
  let digits = mobile.replace(/\D/g, '');

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
    return `0${normalized.slice(2)}`;
  }
  // Fallback: strip leading zeros from whatever is stored
  return mobile.replace(/^0+/, '0');
}
