const Masjid = require('../models/Masjid');

async function isValidMasjid(name) {
  if (!name || !String(name).trim()) return false;
  const exists = await Masjid.findOne({ name: String(name).trim() });
  return !!exists;
}

module.exports = { isValidMasjid };
