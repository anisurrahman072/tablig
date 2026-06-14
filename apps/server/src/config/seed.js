const Masjid = require('../models/Masjid');
const Account = require('../models/Account');
const School = require('../models/School');
const Person = require('../models/Person');
const { MASJIDS } = require('../constants');
const { getSuperAdminMobile, isSuperAdminMobile } = require('../constants/admin');
const { normalizeMobile } = require('../utils/mobile');

const SEED_SCHOOLS = [
  'বাউনিয়া উচ্চ বিদ্যালয়',
  'করিমবাগ উচ্চ বিদ্যালয়',
  'বাদালদী উচ্চ বিদ্যালয়',
];

async function seedMasjids() {
  for (const name of MASJIDS) {
    await Masjid.updateOne({ name }, { name }, { upsert: true });
  }
}

async function seedSchools() {
  // Only seed defaults on a fresh database — never recreate schools after admin deletes them.
  const hasAnySchool = await School.exists({});
  if (hasAnySchool) return;

  for (const name of SEED_SCHOOLS) {
    await School.create({ name });
  }
}

async function fixMobileNumbers() {
  // Fix all accounts with badly stored mobile numbers
  const accounts = await Account.find({});
  for (const account of accounts) {
    const fixed = normalizeMobile(account.mobile);
    if (fixed !== account.mobile && /^8801[3-9]\d{8}$/.test(fixed)) {
      const clash = await Account.findOne({ mobile: fixed, _id: { $ne: account._id } });
      if (!clash) {
        console.log(`[মোবাইল ঠিক] Account: ${account.mobile} → ${fixed}`);
        account.mobile = fixed;
        await account.save();
      }
    }
  }

  // Fix all person mobile + fatherMobile fields
  const persons = await Person.find({});
  for (const person of persons) {
    let changed = false;

    if (person.mobile) {
      const fixed = normalizeMobile(person.mobile);
      if (fixed !== person.mobile && /^8801[3-9]\d{8}$/.test(fixed)) {
        console.log(`[মোবাইল ঠিক] Person ${person.name}: ${person.mobile} → ${fixed}`);
        person.mobile = fixed;
        changed = true;
      }
    }

    if (person.fatherMobile) {
      const fixed = normalizeMobile(person.fatherMobile);
      if (fixed !== person.fatherMobile && /^8801[3-9]\d{8}$/.test(fixed)) {
        console.log(`[মোবাইল ঠিক] Person ${person.name} fatherMobile: ${person.fatherMobile} → ${fixed}`);
        person.fatherMobile = fixed;
        changed = true;
      }
    }

    if (changed) await person.save();
  }
}

async function seedSuperAdmin() {
  await fixMobileNumbers();

  await Account.updateOne(
    { mobile: getSuperAdminMobile() },
    { $set: { isAdmin: true } }
  );
}

module.exports = { seedMasjids, seedSchools, seedSuperAdmin };
