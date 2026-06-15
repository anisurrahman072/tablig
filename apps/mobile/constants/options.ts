export const TIME_GIVEN_OPTIONS = [
  { label: 'তিন দিন', value: 3 },
  { label: 'সাত দিন', value: 7 },
  { label: 'দশ দিন', value: 10 },
  { label: 'এক চিল্লা', value: 40 },
  { label: 'তিন চিল্লা', value: 120 },
  { label: 'এক সাল', value: 365 },
  { label: 'বিদেশ সফর', value: 200 },
  { label: 'সময় দেওয়া হয়নি', value: 0 },
];

export const MASTURAT_DAYS_OPTIONS = [
  { label: 'তিন দিন', value: 3 },
  { label: 'সাত দিন', value: 7 },
  { label: 'দশ দিন', value: 10 },
  { label: 'পনেরো দিন', value: 15 },
  { label: 'সময় দেওয়া হয়নি', value: 0 },
];

export const STUDENT_CLASS_OPTIONS = [
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
export const UNIVERSITY_CLASS_FILTER_VALUE = 13;

export const UNIVERSITY_CLASS_YEAR_VALUES = [9, 10, 11, 12] as const;

const UNIVERSITY_FILTER_PARENT_COLOR = '#156634';
const UNIVERSITY_FILTER_YEAR_COLOR = '#3DAA6A';
const UNIVERSITY_FILTER_PARENT_BG = '#DCEEDE';
const UNIVERSITY_FILTER_YEAR_BG = '#EDF8F1';

type ClassFilterOption = {
  label: string;
  value: number;
  textColor?: string;
  backgroundColor?: string;
};

export const STUDENT_CLASS_FILTER_OPTIONS: ClassFilterOption[] = STUDENT_CLASS_OPTIONS.flatMap(
  (opt) => {
    if (opt.value === 9) {
      return [
        {
          label: 'ইউনিভার্সিটি',
          value: UNIVERSITY_CLASS_FILTER_VALUE,
          textColor: UNIVERSITY_FILTER_PARENT_COLOR,
          backgroundColor: UNIVERSITY_FILTER_PARENT_BG,
        },
        {
          ...opt,
          textColor: UNIVERSITY_FILTER_YEAR_COLOR,
          backgroundColor: UNIVERSITY_FILTER_YEAR_BG,
        },
      ];
    }
    if (UNIVERSITY_CLASS_YEAR_VALUES.includes(opt.value as (typeof UNIVERSITY_CLASS_YEAR_VALUES)[number])) {
      return [
        {
          ...opt,
          textColor: UNIVERSITY_FILTER_YEAR_COLOR,
          backgroundColor: UNIVERSITY_FILTER_YEAR_BG,
        },
      ];
    }
    return [opt];
  },
);

export const KARGUZARI_TIME_SLOTS = [
  'ফজরের পরে',
  'দশটার দিকে',
  'জুহুরের পরে',
  'আসরের পরে',
  'মাগরিবের পরে',
  'ইশার পরে',
];
