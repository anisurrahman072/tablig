const { normalizeMobile } = require('../utils/mobile');

const DEFAULT_SUPER_ADMIN_MOBILE = '8801780581427';

function getSuperAdminMobile() {
  const raw = process.env.SUPER_ADMIN_MOBILE || DEFAULT_SUPER_ADMIN_MOBILE;
  const normalized = normalizeMobile(String(raw).trim());
  if (/^8801[3-9]\d{8}$/.test(normalized)) {
    return normalized;
  }
  return DEFAULT_SUPER_ADMIN_MOBILE;
}

function isSuperAdminMobile(mobile) {
  if (!mobile) return false;
  return normalizeMobile(mobile) === getSuperAdminMobile();
}

module.exports = {
  getSuperAdminMobile,
  isSuperAdminMobile,
};
