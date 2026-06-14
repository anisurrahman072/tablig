const GSM_SINGLE_LIMIT = 160;
const UNICODE_SINGLE_LIMIT = 70;
const GSM_SEGMENT_LIMIT = 153;
const UNICODE_SEGMENT_LIMIT = 67;

/** Default prefix shown in the admin SMS composer (user may edit). */
export const CUSTOM_USER_SMS_PREFIX = 'তাবলীগ হালকা 226 - ';

/** Default text pre-filled when the admin SMS modal opens. */
export const CUSTOM_USER_SMS_DEFAULT = 'তাবলীগ হালকা 226 - আসসালামু আলাইকুম।';

/** Max characters for the full composed SMS text. */
export const CUSTOM_USER_SMS_MAX_TOTAL = 210;

/** Show soft warning once the full message reaches this length. */
export const CUSTOM_USER_SMS_WARN_TOTAL = 140;

export const CUSTOM_USER_SMS_WARN_MESSAGE = 'মেসেজটি বড় হয়ে গেছে। ছোট করুন।';

const GSM_EXTENDED = /[\^{}\\\[~\]|€]/;

export function isUnicodeMessage(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) return true;
  }
  return GSM_EXTENDED.test(text);
}

export function countSmsParts(text: string): number {
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

export function getSmsLimits(text = '') {
  const unicode = isUnicodeMessage(text);
  const maxChars = unicode ? UNICODE_SINGLE_LIMIT : GSM_SINGLE_LIMIT;
  const charCount = text.length;
  const parts = countSmsParts(text);

  return {
    unicode,
    maxChars,
    charCount,
    parts,
    encoding: unicode ? 'unicode' as const : 'gsm' as const,
  };
}

/** Limits for the full admin-composed SMS text shown in the modal. */
export function getCustomSmsLimits(message = '') {
  const limits = getSmsLimits(message);
  const totalLength = message.length;

  return {
    unicode: true,
    maxTotal: CUSTOM_USER_SMS_MAX_TOTAL,
    totalLength,
    parts: limits.parts,
    encoding: 'unicode' as const,
    isOverWarn: totalLength >= CUSTOM_USER_SMS_WARN_TOTAL,
    isOverMax: totalLength > CUSTOM_USER_SMS_MAX_TOTAL,
  };
}

export function clampCustomSmsMessage(text: string): string {
  if (text.length <= CUSTOM_USER_SMS_MAX_TOTAL) return text;
  return text.slice(0, CUSTOM_USER_SMS_MAX_TOTAL);
}

export function customSmsLimitHint() {
  return `বাংলা: সর্বোচ্চ ${CUSTOM_USER_SMS_MAX_TOTAL} অক্ষর`;
}
