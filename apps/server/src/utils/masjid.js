const Masjid = require('../models/Masjid');
const { MASJID_UNKNOWN } = require('../constants');

async function isValidMasjid(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  if (trimmed === MASJID_UNKNOWN) return true;
  const exists = await Masjid.findOne({ name: trimmed });
  return !!exists;
}

module.exports = { isValidMasjid, MASJID_UNKNOWN };
