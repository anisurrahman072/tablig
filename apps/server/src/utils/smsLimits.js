const GSM_SINGLE_LIMIT = 160;
const UNICODE_SINGLE_LIMIT = 70;
const GSM_SEGMENT_LIMIT = 153;
const UNICODE_SEGMENT_LIMIT = 67;

/** Default prefix for the admin SMS composer (client may edit before send). */
const CUSTOM_USER_SMS_PREFIX = 'তাবলীগ হালকা 226 - ';

/** Max characters for the full composed SMS text. */
const CUSTOM_USER_SMS_MAX_TOTAL = 210;

/** Clients show a soft warning once the full message reaches this length. */
const CUSTOM_USER_SMS_WARN_TOTAL = 140;

// GSM 03.38 extension characters that force Unicode encoding on many gateways.
const GSM_EXTENDED = /[\^{}\\\[~\]|€]/;

function isUnicodeMessage(text) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) return true;
  }
  return GSM_EXTENDED.test(text);
}

function countSmsParts(text) {
  if (!text) return 0;
  const unicode = isUnicodeMessage(text);
  const len = text.length;
  if (unicode) {
    if (len <= UNICODE_SINGLE_LIMIT) return 1;
    return Math.ceil((len - UNICODE_SINGLE_LIMIT) / UNICODE_SEGMENT_LIMIT) + 1;
  }
  if (len <= GSM_SINGLE_LIMIT) return 1;
  return Math.ceil((len - GSM_SINGLE_LIMIT) / GSM_SEGMENT_LIMIT) + 1;
}

function getSmsLimits(text = '') {
  const unicode = isUnicodeMessage(text);
  const maxChars = unicode ? UNICODE_SINGLE_LIMIT : GSM_SINGLE_LIMIT;
  const charCount = text.length;
  const parts = countSmsParts(text);

  return {
    unicode,
    maxChars,
    charCount,
    parts,
    encoding: unicode ? 'unicode' : 'gsm',
  };
}

/** Single-segment validation — used only for short system messages (e.g. forgot-PIN OTP). */
function validateSmsMessage(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'মেসেজ লিখুন' };
  }

  const limits = getSmsLimits(trimmed);
  if (limits.parts > 1) {
    const limitLabel = limits.unicode ? '৭০' : '১৬০';
    return {
      ok: false,
      error: `একটি এসএমএসে সর্বোচ্চ ${limitLabel} অক্ষর লিখতে পারবেন`,
      limits,
    };
  }

  if (trimmed.length > limits.maxChars) {
    return { ok: false, error: 'মেসেজ খুব বড় হয়েছে', limits };
  }

  return { ok: true, message: trimmed, limits };
}

function validateCustomUserSmsMessage(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'মেসেজ লিখুন' };
  }

  const limits = getSmsLimits(trimmed);

  if (trimmed.length > CUSTOM_USER_SMS_MAX_TOTAL) {
    return {
      ok: false,
      error: `সর্বোচ্চ ${CUSTOM_USER_SMS_MAX_TOTAL} অক্ষর লিখতে পারবেন`,
      limits,
    };
  }

  return { ok: true, message: trimmed, fullMessage: trimmed, limits };
}

module.exports = {
  CUSTOM_USER_SMS_PREFIX,
  CUSTOM_USER_SMS_WARN_TOTAL,
  CUSTOM_USER_SMS_MAX_TOTAL,
  GSM_SINGLE_LIMIT,
  UNICODE_SINGLE_LIMIT,
  isUnicodeMessage,
  countSmsParts,
  getSmsLimits,
  validateSmsMessage,
  validateCustomUserSmsMessage,
};
