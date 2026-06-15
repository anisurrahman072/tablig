const MASJID_UNKNOWN = 'মসজিদ জানা নেই';

const MASJIDS = [
  'বাউনিয়া বাজার মসজিদ',
  'করিমবাগ মসজিদ',
  'বাদালদী মসজিদ',
];

const TIME_GIVEN_OPTIONS = [
  { label: 'তিন দিন', value: 3 },
  { label: 'সাত দিন', value: 7 },
  { label: 'দশ দিন', value: 10 },
  { label: 'এক চিল্লা', value: 40 },
  { label: 'তিন চিল্লা', value: 120 },
  { label: 'এক সাল', value: 365 },
  { label: 'বিদেশ সফর', value: 200 },
  { label: 'সময় দেওয়া হয়নি', value: 0 },
];

const MASTURAT_DAYS_OPTIONS = [
  { label: 'তিন দিন', value: 3 },
  { label: 'সাত দিন', value: 7 },
  { label: 'দশ দিন', value: 10 },
  { label: 'পনেরো দিন', value: 15 },
  { label: 'সময় দেওয়া হয়নি', value: 0 },
];

const STUDENT_CLASS_OPTIONS = [
  { label: 'ক্লাস সেভেন', value: 1 },
  { label: 'ক্লাস এইট', value: 2 },
  { label: 'ক্লাস নাইন', value: 3 },
  { label: 'ক্লাস টেন (নিউ টেন)', value: 4 },
  { label: 'এসএসসি পরীক্ষার্থী (SSC)', value: 5 },
  { label: 'ইন্টার - ফার্স্ট ইয়ার', value: 6 },
  { label: 'ইন্টার - সেকেন্ড ইয়ার', value: 7 },
  { label: 'এইচএসসি পরীক্ষার্থী (HSC)', value: 8 },
  { label: 'উইনিভার্সিটি - ফার্স্ট ইয়ার', value: 9 },
  { label: 'উইনিভার্সিটি - সেকেন্ড ইয়ার', value: 10 },
  { label: 'উইনিভার্সিটি - থার্ড ইয়ার', value: 11 },
  { label: 'উইনিভার্সিটি - ফোর্থ ইয়ার', value: 12 },
];

/** Filter-only: matches all university year classes (9–12). Not stored on persons. */
const UNIVERSITY_CLASS_FILTER_VALUE = 13;
const UNIVERSITY_CLASS_YEAR_VALUES = [9, 10, 11, 12];

const KARGUZARI_TIME_SLOTS = [
  'ফজরের পরে',
  'দশটার দিকে',
  'জুহুরের পরে',
  'আসরের পরে',
  'মাগরিবের পরে',
  'ইশার পরে',
];

const PERSON_TYPES = ['sathi', 'student'];

module.exports = {
  MASJID_UNKNOWN,
  MASJIDS,
  TIME_GIVEN_OPTIONS,
  MASTURAT_DAYS_OPTIONS,
  STUDENT_CLASS_OPTIONS,
  UNIVERSITY_CLASS_FILTER_VALUE,
  UNIVERSITY_CLASS_YEAR_VALUES,
  KARGUZARI_TIME_SLOTS,
  PERSON_TYPES,
};
