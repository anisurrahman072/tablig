const Account = require('../models/Account');
const Person = require('../models/Person');
const { ACTIVE } = require('./directory');

async function resolveSmsTarget(id) {
  const person = await Person.findOne({ _id: id, isDeleted: ACTIVE });
  if (person) {
    return {
      targetId: person._id,
      personId: person._id,
      name: person.name,
      mobile: person.mobile,
      type: person.type,
    };
  }

  const account = await Account.findOne({ _id: id, isDeleted: ACTIVE });
  if (!account || !account.mobile) {
    return null;
  }

  const linkedPerson = await Person.findOne({ mobile: account.mobile, isDeleted: ACTIVE });

  return {
    targetId: account._id,
    personId: linkedPerson?._id ?? null,
    name: account.name,
    mobile: account.mobile,
    type: linkedPerson?.type ?? 'sathi',
  };
}

module.exports = { resolveSmsTarget };
