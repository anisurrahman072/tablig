const Account = require('../models/Account');
const Person = require('../models/Person');
const Karguzari = require('../models/Karguzari');
const {
  UNIVERSITY_CLASS_FILTER_VALUE,
  UNIVERSITY_CLASS_YEAR_VALUES,
} = require('../constants');
const {
  ACCOUNT_TEXT_FIELDS,
  PERSON_TEXT_FIELDS,
  buildRegexOrConditions,
  scoreDirectoryEntry,
  entryMatchesQuery,
  queryMatchesSathiKeyword,
  queryMatchesStudentKeyword,
} = require('./search');

const ACTIVE = { $ne: true };

const personPopulate = [
  { path: 'createdBy', select: 'name' },
  { path: 'claimedBy', select: 'name lastLoginAt' },
];

function pickLinkedPerson(persons, accountId = null) {
  if (!persons?.length) return null;

  if (accountId) {
    const claimedMatch = persons.find((p) => {
      const claimedById = p.claimedBy?._id ?? p.claimedBy;
      return claimedById != null && String(claimedById) === String(accountId);
    });
    if (claimedMatch) return claimedMatch;
  }

  const sathi = persons.find((p) => p.type === 'sathi');
  return sathi || persons[0];
}

async function findLinkedPersonByMobile(mobile, accountId = null) {
  if (!mobile) return null;

  const persons = await Person.find({ mobile, isDeleted: ACTIVE })
    .populate(personPopulate)
    .sort({ updatedAt: -1 });

  return pickLinkedPerson(persons, accountId);
}

async function findLinkedPersonsByMobiles(mobiles) {
  const uniqueMobiles = [...new Set(mobiles.filter(Boolean))];
  if (!uniqueMobiles.length) return new Map();

  const persons = await Person.find({ mobile: { $in: uniqueMobiles }, isDeleted: ACTIVE })
    .populate(personPopulate)
    .sort({ updatedAt: -1 });

  const map = new Map();
  for (const mobile of uniqueMobiles) {
    const matches = persons.filter((p) => p.mobile === mobile);
    const picked = pickLinkedPerson(matches);
    if (picked) map.set(mobile, picked);
  }
  return map;
}

/**
 * Find the linked Person for a single Account.
 * First tries by mobile match; falls back to a claimedBy reference lookup so that
 * persons created without a mobile (or whose mobile was later changed) are still
 * linked and their extra fields (timeGivenValue, masturatDaysValue, profession, …)
 * are returned instead of showing blank dashes.
 */
async function findLinkedPersonForAccount(account) {
  if (account.mobile) {
    const persons = await Person.find({ mobile: account.mobile, isDeleted: ACTIVE })
      .populate(personPopulate)
      .sort({ updatedAt: -1 });
    const picked = pickLinkedPerson(persons, account._id);
    if (picked) return picked;
  }

  // Fallback: person was claimed by this account but has a different / missing mobile
  const byRef = await Person.findOne({ claimedBy: account._id, isDeleted: ACTIVE })
    .populate(personPopulate);
  return byRef || null;
}

/**
 * Bulk version of findLinkedPersonForAccount for use in listDirectoryEntries.
 * Returns { byMobile: Map<mobile, person>, byAccountId: Map<accountId, person> }
 * where byAccountId covers accounts that had no mobile match.
 */
async function findLinkedPersonsForAccounts(accounts) {
  if (!accounts.length) return { byMobile: new Map(), byAccountId: new Map() };

  const mobiles = [...new Set(accounts.map((a) => a.mobile).filter(Boolean))];
  const accountIds = accounts.map((a) => a._id);

  const [mobilePersons, claimedPersons] = await Promise.all([
    mobiles.length
      ? Person.find({ mobile: { $in: mobiles }, isDeleted: ACTIVE })
          .populate(personPopulate)
          .sort({ updatedAt: -1 })
      : Promise.resolve([]),
    Person.find({ claimedBy: { $in: accountIds }, isDeleted: ACTIVE }).populate(personPopulate),
  ]);

  // Build mobile → best-person map
  const byMobile = new Map();
  for (const mobile of mobiles) {
    const matches = mobilePersons.filter((p) => p.mobile === mobile);
    const acc = accounts.find((a) => a.mobile === mobile);
    const picked = pickLinkedPerson(matches, acc?._id);
    if (picked) byMobile.set(mobile, picked);
  }

  // Build accountId → person map for claimedBy fallback (only for accounts without a mobile match)
  const byAccountId = new Map();
  for (const person of claimedPersons) {
    const cid = String(person.claimedBy?._id ?? person.claimedBy);
    const acc = accounts.find((a) => String(a._id) === cid);
    if (!acc) continue;
    // Only use the claimedBy fallback when the mobile lookup didn't produce a result
    if (acc.mobile && byMobile.has(acc.mobile)) continue;
    if (!byAccountId.has(cid)) {
      byAccountId.set(cid, person);
    }
  }

  return { byMobile, byAccountId };
}

async function repairClaimLink(account, linkedPerson) {
  if (!linkedPerson) return linkedPerson;

  let person = linkedPerson;
  let accountChanged = false;

  const claimedById = person.claimedBy?._id ?? person.claimedBy;
  if (!claimedById) {
    person.claimedBy = account._id;
    person.isLocked = true;
    person = await person.save();
    await person.populate(personPopulate);
  }

  const signupHouse = account.houseAddress?.trim();
  const personHouse = person.houseLocation?.trim();
  if (!signupHouse && personHouse) {
    account.houseAddress = personHouse;
    accountChanged = true;
  }

  if (accountChanged) {
    await account.save();
  }

  return person;
}

function formatMergedAccountEntry(account, linkedPerson, viewer) {
  const viewerId = String(viewer._id);
  const claimedById = linkedPerson?.claimedBy?._id ?? linkedPerson?.claimedBy;
  const isOwner =
    String(account._id) === viewerId ||
    (claimedById != null && String(claimedById) === viewerId);

  const base = {
    _id: account._id,
    source: 'account',
    type: linkedPerson?.type || 'sathi',
    name: account.name,
    masjid: account.masjid,
    houseLocation: account.houseAddress?.trim() || linkedPerson?.houseLocation?.trim() || '',
    mobile: account.mobile,
    isLocked: linkedPerson?.isLocked ?? true,
    canEdit: viewer.isAdmin || isOwner || !linkedPerson?.isLocked,
    canDelete: viewer.isAdmin,
    updatedAt: account.updatedAt,
    createdAt: account.createdAt,
  };

  if (!linkedPerson) return base;

  const personObj = linkedPerson.toObject ? linkedPerson.toObject() : linkedPerson;
  return {
    ...personObj,
    ...base,
    _id: account._id,
    personId: personObj._id,
    source: 'account',
  };
}

function formatAccountEntry(account, viewer, linkedPerson = null) {
  return formatMergedAccountEntry(account, linkedPerson, viewer);
}

function formatPersonEntry(person, viewer) {
  const obj = person.toObject ? person.toObject() : person;
  const claimedById = obj.claimedBy?._id ?? obj.claimedBy;
  const viewerId = String(viewer._id);

  return {
    ...obj,
    source: 'person',
    canEdit:
      !obj.isLocked || (claimedById != null && String(claimedById) === viewerId) || viewer.isAdmin,
    canDelete: viewer.isAdmin || !obj.isLocked,
  };
}

function hasStudentOnlyFilters({ classValue, schoolName }) {
  return (classValue != null && classValue !== '') || !!schoolName;
}

function shouldIncludeAccounts({ type, classValue, schoolName, claimedStatus }) {
  if (hasStudentOnlyFilters({ classValue, schoolName })) return false;
  if (claimedStatus === 'unclaimed') return false;
  if (type === 'student') return false;
  return true;
}

function needsRestrictedAccountLookup({ timeGivenValue, masturatDaysValue, claimedStatus }) {
  return (
    claimedStatus === 'claimed' ||
    (timeGivenValue != null && timeGivenValue !== '') ||
    (masturatDaysValue != null && masturatDaysValue !== '')
  );
}

function buildExactPersonFilter({
  type,
  masjid,
  classValue,
  schoolName,
  timeGivenValue,
  masturatDaysValue,
  claimedStatus,
}) {
  const filter = { isDeleted: ACTIVE };

  const effectiveType =
    hasStudentOnlyFilters({ classValue, schoolName }) && type !== 'sathi' ? 'student' : type;

  if (effectiveType && ['sathi', 'student'].includes(effectiveType)) {
    filter.type = effectiveType;
  }
  if (masjid) filter.masjid = masjid;
  if (classValue != null && classValue !== '') {
    const num = Number(classValue);
    if (num === UNIVERSITY_CLASS_FILTER_VALUE) {
      filter.classValue = { $in: UNIVERSITY_CLASS_YEAR_VALUES };
    } else {
      filter.classValue = num;
    }
  }
  if (schoolName) filter.schoolName = schoolName;
  if (timeGivenValue != null && timeGivenValue !== '') {
    filter.timeGivenValue = Number(timeGivenValue);
  }
  if (masturatDaysValue != null && masturatDaysValue !== '') {
    filter.masturatDaysValue = Number(masturatDaysValue);
  }
  if (claimedStatus === 'claimed') {
    filter.isLocked = true;
  } else if (claimedStatus === 'unclaimed') {
    filter.isLocked = false;
  }

  return filter;
}

async function findMatchingAccountIdsForPersonFilter(exactPersonFilter, exactAccountFilter) {
  const persons = await Person.find(exactPersonFilter, { mobile: 1, claimedBy: 1 }).lean();
  if (!persons.length) return [];

  const claimedIds = [...new Set(persons.map((p) => p.claimedBy).filter(Boolean))];
  const mobiles = [...new Set(persons.map((p) => p.mobile).filter(Boolean))];

  const orConditions = [];
  if (claimedIds.length) orConditions.push({ _id: { $in: claimedIds } });
  if (mobiles.length) orConditions.push({ mobile: { $in: mobiles } });
  if (!orConditions.length) return [];

  const accounts = await Account.find(
    { ...exactAccountFilter, $or: orConditions },
    { _id: 1 },
  ).lean();
  return accounts.map((a) => a._id);
}

function buildExactAccountFilter({ masjid }) {
  const filter = { isDeleted: ACTIVE };
  if (masjid) filter.masjid = masjid;
  return filter;
}

/**
 * Maximum number of DB records fetched per collection when performing a text-search
 * with in-memory relevance scoring. Bounds memory and latency for the search path.
 */
const MAX_SEARCH_CANDIDATES = 300;

/**
 * Fetches the last 2 karguzari for each entry's linked person.
 * Only called when the caller opts in via withKarguzari=true.
 * Never runs on more than ~10-20 entries (one page), so it is cheap.
 */
async function attachRecentKarguzari(entries) {
  // Resolve the real Person _id for each entry:
  //   account entries have a linkedPerson whose id is stored in personId
  //   standalone person entries use _id directly
  const personIds = [];
  for (const entry of entries) {
    const pid = entry.source === 'account' ? entry.personId : entry._id;
    if (pid) personIds.push(pid);
  }

  if (personIds.length === 0) return entries;

  const all = await Karguzari.find({ person: { $in: personIds } })
    .sort({ meetingDate: -1, createdAt: -1 })
    .populate('author', 'name')
    .populate('attendees', 'name')
    .lean();

  const karguzariMap = new Map();
  for (const k of all) {
    const pid = String(k.person);
    if (!karguzariMap.has(pid)) karguzariMap.set(pid, []);
    const list = karguzariMap.get(pid);
    if (list.length >= 2) continue;

    const attendeeNames = [
      ...(k.attendees?.map((a) => a.name).filter(Boolean) || []),
      ...(k.attendeeNames || []),
    ];

    list.push({
      _id: k._id,
      meetingDate: k.meetingDate,
      timeSlot: k.timeSlot,
      text: k.text,
      author: k.author ? { name: k.author.name } : undefined,
      attendeeNames: [...new Set(attendeeNames)],
    });
  }

  return entries.map((entry) => {
    const pid = entry.source === 'account' ? entry.personId : entry._id;
    const recentKarguzari = pid ? (karguzariMap.get(String(pid)) || []) : [];
    return { ...entry, recentKarguzari };
  });
}

async function listDirectoryEntries(query, viewer) {
  const {
    q,
    type,
    classValue,
    schoolName,
    masjid,
    timeGivenValue,
    masturatDaysValue,
    claimedStatus,
    withKarguzari,
    page = 1,
    limit = 10,
  } = query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(50, Number(limit) || 10));
  const searchQ = String(q || '').trim();

  const filterParams = {
    type,
    masjid,
    classValue,
    schoolName,
    timeGivenValue,
    masturatDaysValue,
    claimedStatus,
  };
  const includeAccounts = shouldIncludeAccounts(filterParams);
  const restrictAccounts = needsRestrictedAccountLookup(filterParams);

  const exactPersonFilter = buildExactPersonFilter(filterParams);
  const exactAccountFilter = buildExactAccountFilter({ masjid });

  const wantsKarguzari = withKarguzari === 'true' || withKarguzari === true;

  const result = searchQ
    ? await _listWithSearch({
        exactPersonFilter,
        exactAccountFilter,
        searchQ,
        includeAccounts,
        restrictAccounts,
        pageNum,
        limitNum,
        viewer,
      })
    : await _listPaginated({
        exactPersonFilter,
        exactAccountFilter,
        includeAccounts,
        restrictAccounts,
        pageNum,
        limitNum,
        viewer,
      });

  if (wantsKarguzari && result.data.length > 0) {
    result.data = await attachRecentKarguzari(result.data);
  }

  return result;
}

/**
 * Pagination without a text-search query.
 *
 * Performance strategy — minimise data fetched and maximise parallelism:
 *  Phase 1 (parallel): fetch accounts + persons with MINIMAL fields only — just
 *    enough for dedup and sort. Persons include `claimedBy` so we can compute the
 *    dedup set in-memory without an extra round-trip.
 *  Phase 2: build merged list, sort by updatedAt DESC, slice the requested page.
 *  Phase 3 (parallel): fetch FULL documents (with populate) only for the page
 *    items (typically 5–10), then fetch linked persons for that small set.
 *    This is the key win: populate never runs on the full collection.
 */
async function _listPaginated({
  exactPersonFilter,
  exactAccountFilter,
  includeAccounts,
  restrictAccounts,
  pageNum,
  limitNum,
  viewer,
}) {
  const skip = (pageNum - 1) * limitNum;

  // Person-only: simple single-collection aggregation (no cross-collection dedup needed)
  if (!includeAccounts) {
    const [result] = await Person.aggregate([
      { $match: exactPersonFilter },
      { $sort: { updatedAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limitNum }],
        },
      },
    ]);
    const total = result.metadata[0]?.total ?? 0;
    const docs = result.data ?? [];
    return {
      data: docs.map((p) => formatPersonEntry(p, viewer)),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
    };
  }

  // ── Phase 1: minimal fields only, both collections in parallel ───────────────

  let resolvedAccountFilter = exactAccountFilter;
  if (restrictAccounts) {
    const matchingIds = await findMatchingAccountIdsForPersonFilter(
      exactPersonFilter,
      exactAccountFilter,
    );
    resolvedAccountFilter = { ...exactAccountFilter, _id: { $in: matchingIds } };
  }

  const [accountsMinimal, personsMinimal] = await Promise.all([
    Account.find(resolvedAccountFilter, { _id: 1, mobile: 1, updatedAt: 1 }).lean(),
    Person.find(exactPersonFilter, { _id: 1, mobile: 1, type: 1, updatedAt: 1, claimedBy: 1 }).lean(),
  ]);

  const accountMobiles = new Set(accountsMinimal.map((a) => a.mobile).filter(Boolean));
  const accountIdStrings = new Set(accountsMinimal.map((a) => String(a._id)));

  // Dedup: identify accounts that already have a mobile-matched person, so that
  // claimedBy persons for those accounts are NOT excluded (they may appear standalone).
  const mobilesWithPersonMatch = new Set(
    personsMinimal.filter((p) => p.mobile && accountMobiles.has(p.mobile)).map((p) => p.mobile),
  );
  const accountsWithMobileMatch = new Set(
    accountsMinimal
      .filter((a) => a.mobile && mobilesWithPersonMatch.has(a.mobile))
      .map((a) => String(a._id)),
  );

  // representedPersonIds: persons claimed by accounts that have NO mobile-matched person.
  // (Mirrors findLinkedPersonsForAccounts claimedBy-fallback logic exactly.)
  const representedPersonIds = new Set();
  for (const p of personsMinimal) {
    if (!p.claimedBy) continue;
    const aid = String(p.claimedBy);
    if (!accountIdStrings.has(aid)) continue;
    if (accountsWithMobileMatch.has(aid)) continue;
    representedPersonIds.add(String(p._id));
  }

  const standalonePersonItems = personsMinimal
    .filter((p) => {
      if (p.type !== 'sathi') return true;
      if (p.mobile && accountMobiles.has(p.mobile)) return false;
      if (representedPersonIds.has(String(p._id))) return false;
      return true;
    })
    .map((p) => ({ id: String(p._id), source: 'person', updatedAt: p.updatedAt }));

  const accountItems = accountsMinimal.map((a) => ({
    id: String(a._id),
    source: 'account',
    updatedAt: a.updatedAt,
  }));

  const merged = [...accountItems, ...standalonePersonItems].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );

  const total = merged.length;
  const pageItems = merged.slice(skip, skip + limitNum);

  if (pageItems.length === 0) {
    return {
      data: [],
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
    };
  }

  // ── Phase 3: full docs only for this page's items (parallel) ─────────────────

  const pageAccountIds = pageItems.filter((i) => i.source === 'account').map((i) => i.id);
  const pagePersonIds = pageItems.filter((i) => i.source === 'person').map((i) => i.id);

  const [pageAccountDocs, pagePersons] = await Promise.all([
    pageAccountIds.length
      ? Account.find({ _id: { $in: pageAccountIds } }).lean()
      : Promise.resolve([]),
    pagePersonIds.length
      ? Person.find({ _id: { $in: pagePersonIds } }).populate(personPopulate)
      : Promise.resolve([]),
  ]);

  const accountMap = new Map(pageAccountDocs.map((a) => [String(a._id), a]));
  const personMap = new Map(pagePersons.map((p) => [String(p._id), p]));

  // Linked persons only for this page's accounts (small set, populate is cheap here)
  const { byMobile: pageLinkedByMobile, byAccountId: pageLinkedByAccountId } =
    await findLinkedPersonsForAccounts(pageAccountDocs);

  const data = pageItems
    .map((item) => {
      if (item.source === 'account') {
        const a = accountMap.get(item.id);
        if (!a) return null;
        const linked =
          pageLinkedByMobile.get(a.mobile) || pageLinkedByAccountId.get(String(a._id)) || null;
        return formatAccountEntry(a, viewer, linked);
      }
      const p = personMap.get(item.id);
      return p ? formatPersonEntry(p, viewer) : null;
    })
    .filter(Boolean);

  return {
    data,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  };
}

/**
 * Text-search path: fetches up to MAX_SEARCH_CANDIDATES per collection,
 * deduplicates and scores in memory, then slices the requested page.
 *
 * Performance strategy:
 *  - Dedup via a lean `claimedBy` query instead of full findLinkedPersonsForAccounts —
 *    avoids loading + populating up to 300 linked persons just to compute a dedup set.
 *  - Account entries are scored using account-only fields (which is all
 *    getAccountSearchableFields checks anyway), so no linked person is needed for scoring.
 *  - findLinkedPersonsForAccounts (with populate) runs only for the ~5-10 page items
 *    AFTER the sort/slice, then those account entries are re-formatted with full data.
 */
async function _listWithSearch({
  exactPersonFilter,
  exactAccountFilter,
  searchQ,
  includeAccounts,
  restrictAccounts,
  pageNum,
  limitNum,
  viewer,
}) {
  const skip = (pageNum - 1) * limitNum;

  const personSearchOr = buildRegexOrConditions(PERSON_TEXT_FIELDS, searchQ);
  if (queryMatchesStudentKeyword(searchQ)) personSearchOr.push({ type: 'student' });
  if (queryMatchesSathiKeyword(searchQ)) personSearchOr.push({ type: 'sathi' });

  const personQuery = {
    ...exactPersonFilter,
    ...(personSearchOr.length ? { $or: personSearchOr } : {}),
  };

  let accountQuery = null;
  if (includeAccounts) {
    let baseAccountFilter = { ...exactAccountFilter };
    if (restrictAccounts) {
      const matchingIds = await findMatchingAccountIdsForPersonFilter(
        exactPersonFilter,
        exactAccountFilter,
      );
      baseAccountFilter = { ...exactAccountFilter, _id: { $in: matchingIds } };
    }

    if (queryMatchesSathiKeyword(searchQ)) {
      accountQuery = baseAccountFilter;
    } else {
      const accountSearchOr = buildRegexOrConditions(ACCOUNT_TEXT_FIELDS, searchQ);
      accountQuery = accountSearchOr.length
        ? { ...baseAccountFilter, $or: accountSearchOr }
        : baseAccountFilter;
    }
  }

  // Step 1: Fetch matching candidates in parallel
  const [persons, accounts] = await Promise.all([
    Person.find(personQuery)
      .sort({ updatedAt: -1 })
      .limit(MAX_SEARCH_CANDIDATES)
      .populate('createdBy', 'name')
      .populate('claimedBy', 'name lastLoginAt'),
    accountQuery
      ? Account.find(accountQuery).sort({ updatedAt: -1 }).limit(MAX_SEARCH_CANDIDATES).lean()
      : Promise.resolve([]),
  ]);

  // Step 2: Lean dedup — one small query instead of findLinkedPersonsForAccounts(ALL accounts)
  const accountMobiles = new Set(accounts.map((a) => a.mobile).filter(Boolean));
  const accountIds = accounts.map((a) => a._id);

  const claimedPersonsLean = accountIds.length
    ? await Person.find(
        { claimedBy: { $in: accountIds }, isDeleted: ACTIVE },
        { _id: 1, claimedBy: 1 },
      ).lean()
    : [];

  // Replicate the original claimedBy-fallback rule: only exclude claimedBy persons
  // for accounts that have NO mobile-matched person (same logic as findLinkedPersonsForAccounts).
  const mobilesWithPersonMatch = new Set(
    persons.filter((p) => p.mobile && accountMobiles.has(p.mobile)).map((p) => p.mobile),
  );
  const accountsWithMobileMatch = new Set(
    accounts
      .filter((a) => a.mobile && mobilesWithPersonMatch.has(a.mobile))
      .map((a) => String(a._id)),
  );
  const representedPersonIds = new Set();
  for (const p of claimedPersonsLean) {
    const aid = String(p.claimedBy);
    if (accountsWithMobileMatch.has(aid)) continue;
    representedPersonIds.add(String(p._id));
  }

  const filteredPersons = persons.filter((p) => {
    if (p.type !== 'sathi') return true;
    if (p.mobile && accountMobiles.has(p.mobile)) return false;
    if (representedPersonIds.has(String(p._id))) return false;
    return true;
  });

  // Step 3: Format accounts with account-only data for in-memory scoring.
  // getAccountSearchableFields only reads account fields (name, masjid, houseAddress, mobile)
  // so no linked person is needed at this stage.
  let merged = [
    ...accounts.map((a) => formatAccountEntry(a, viewer, null)),
    ...filteredPersons.map((p) => formatPersonEntry(p, viewer)),
  ];

  // Step 4: Filter, score and sort
  merged = merged
    .filter((entry) => entryMatchesQuery(entry, searchQ))
    .map((entry) => ({ ...entry, _searchScore: scoreDirectoryEntry(entry, searchQ) }))
    .sort((a, b) => {
      if (b._searchScore !== a._searchScore) return b._searchScore - a._searchScore;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const total = merged.length;
  const pageSlice = merged.slice(skip, skip + limitNum);

  // Step 5: Enrich only the page's account entries with linked person data
  const pageAccountIds = new Set(
    pageSlice.filter((e) => e.source === 'account').map((e) => String(e._id)),
  );

  let enrichedMap = new Map();
  if (pageAccountIds.size > 0) {
    const pageAccountDocs = accounts.filter((a) => pageAccountIds.has(String(a._id)));
    const { byMobile: pageLinkedByMobile, byAccountId: pageLinkedByAccountId } =
      await findLinkedPersonsForAccounts(pageAccountDocs);

    for (const a of pageAccountDocs) {
      const linked =
        pageLinkedByMobile.get(a.mobile) || pageLinkedByAccountId.get(String(a._id)) || null;
      if (linked) enrichedMap.set(String(a._id), formatAccountEntry(a, viewer, linked));
    }
  }

  const data = pageSlice.map(({ _searchScore, ...entry }) => {
    if (entry.source === 'account') {
      return enrichedMap.get(String(entry._id)) ?? entry;
    }
    return entry;
  });

  return {
    data,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  };
}

async function getDirectoryEntry(id, viewer) {
  const account = await Account.findOne({ _id: id, isDeleted: ACTIVE });
  if (account) {
    // Use enhanced lookup: mobile first, then claimedBy fallback so that persons
    // entered without a phone number (or with a different mobile) are still linked
    // and their detail fields (timeGivenValue, masturatDaysValue, profession, …) show up.
    let linkedPerson = await findLinkedPersonForAccount(account);
    linkedPerson = await repairClaimLink(account, linkedPerson);
    return formatAccountEntry(account, viewer, linkedPerson);
  }

  const person = await Person.findOne({ _id: id, isDeleted: ACTIVE })
    .populate('createdBy', 'name')
    .populate('claimedBy', 'name lastLoginAt');

  if (!person) {
    return null;
  }

  person._viewerId = viewer._id;
  person._isAdmin = viewer.isAdmin;
  return formatPersonEntry(person, viewer);
}

async function softDeleteDirectoryEntry(id, viewer) {
  const account = await Account.findById(id);
  if (account) {
    if (!viewer.isAdmin) {
      throw new Error('FORBIDDEN');
    }
    account.isDeleted = true;
    await account.save();
    return { source: 'account' };
  }

  const person = await Person.findById(id);
  if (!person) {
    return null;
  }

  if (person.isLocked && !viewer.isAdmin) {
    throw new Error('FORBIDDEN');
  }

  person.isDeleted = true;
  await person.save();
  return { source: 'person' };
}

/**
 * Finds the Person linked to an Account, creating one automatically if none exists.
 * This ensures Account-only users (no pre-existing Person in the directory) can
 * participate in the karguzari system (as attendees, profile sections, etc.).
 * The auto-created Person is linked via claimedBy so it is found on subsequent calls
 * without creating duplicates.
 */
async function ensurePersonForAccount(account) {
  const existing = await findLinkedPersonForAccount(account);
  if (existing) return existing;

  return Person.create({
    type: 'sathi',
    name: account.name,
    masjid: account.masjid,
    mobile: account.mobile,
    houseLocation: account.houseAddress?.trim() || '',
    createdBy: account._id,
    claimedBy: account._id,
    isLocked: true,
    isDeleted: false,
  });
}

async function resolvePersonForKarguzari(id) {
  const person = await Person.findOne({ _id: id, isDeleted: ACTIVE });
  if (person) return person;

  const account = await Account.findOne({ _id: id, isDeleted: ACTIVE });
  if (!account) return null;

  return ensurePersonForAccount(account);
}

async function resolvePersonForEdit(id) {
  const person = await Person.findOne({ _id: id, isDeleted: ACTIVE });
  if (person) return person;

  const account = await Account.findOne({ _id: id, isDeleted: ACTIVE });
  if (!account) return null;

  return findLinkedPersonForAccount(account);
}

async function syncClaimedPersonToAccount(person) {
  const claimedById = person.claimedBy?._id ?? person.claimedBy;
  if (!claimedById) return;

  const account = await Account.findOne({ _id: claimedById, isDeleted: ACTIVE });
  if (!account) return;

  account.name = person.name;
  account.masjid = person.masjid;
  account.houseAddress = person.houseLocation?.trim() || '';
  await account.save();
}

async function syncAccountToClaimedPerson(account) {
  if (!account?.mobile) return;

  const person = await findLinkedPersonByMobile(account.mobile, account._id);
  if (!person) return;

  const claimedById = person.claimedBy?._id ?? person.claimedBy;
  if (!claimedById || String(claimedById) !== String(account._id)) return;

  person.name = account.name;
  person.masjid = account.masjid;
  person.houseLocation = account.houseAddress?.trim() || person.houseLocation || '';
  await person.save();
}

module.exports = {
  listDirectoryEntries,
  getDirectoryEntry,
  softDeleteDirectoryEntry,
  resolvePersonForKarguzari,
  ensurePersonForAccount,
  resolvePersonForEdit,
  syncClaimedPersonToAccount,
  syncAccountToClaimedPerson,
  findLinkedPersonByMobile,
  findLinkedPersonForAccount,
  formatAccountEntry,
  formatPersonEntry,
  ACTIVE,
};
