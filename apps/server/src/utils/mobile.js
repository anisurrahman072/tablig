function normalizeMobile(mobile) {
  let digits = String(mobile).replace(/\D/g, '');

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
    return `0${normalized.slice(2)}`;
  }
  return mobile;
}

module.exports = {
  normalizeMobile,
  isValidBangladeshMobile,
  formatMobileForDisplay,
};
