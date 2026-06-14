/**
 * Bengali ↔ Latin (Banglish) search helpers.
 * Used server-side only — all directory filtering happens before pagination.
 */

const {
  extractAsciiDigits,
  buildCrossScriptDigitRegex,
  isDigitOnlyQuery,
} = require('./mobile');

const BN_TO_LATIN = {
  // Standalone vowels
  '\u0985': ['o', 'a'],             // অ
  '\u0986': ['a', 'aa', 'o'],       // আ
  '\u0987': ['i', 'e', 'ee'],       // ই
  '\u0988': ['i', 'ee'],            // ঈ
  '\u0989': ['u', 'oo', 'o'],       // উ — 'o' added: Comilla / Chumur
  '\u098A': ['u', 'oo', 'o'],       // ঊ
  '\u098B': ['ri'],                  // ঋ
  '\u098F': ['e', 'a'],             // এ
  '\u0990': ['oi', 'oy'],           // ঐ
  '\u0993': ['o', 'u', 'w'],        // ও — 'w' added: ওয়াহাব → Wahab
  '\u0994': ['ou', 'ow'],           // ঔ
  // Consonants
  '\u0995': ['k', 'c', 'q'],        // ক
  '\u0996': ['kh', 'k'],            // খ
  '\u0997': ['g', 'gh'],            // গ
  '\u0998': ['gh', 'g'],            // ঘ
  '\u0999': ['ng', 'n'],            // ঙ
  '\u099A': ['c', 'ch'],            // চ
  '\u099B': ['ch', 'chh'],          // ছ
  '\u099C': ['j', 'z', 'g'],        // জ
  '\u099D': ['jh', 'j'],            // ঝ
  '\u099E': ['n', 'ng'],            // ঞ
  '\u099F': ['t'],                   // ট
  '\u09A0': ['th', 't'],            // ঠ
  '\u09A1': ['d'],                   // ড
  '\u09A2': ['dh', 'd'],            // ঢ
  '\u09A3': ['n'],                   // ণ
  '\u09A4': ['t'],                   // ত
  '\u09A5': ['th', 't'],            // থ
  '\u09A6': ['d'],                   // দ
  '\u09A7': ['dh', 'd'],            // ধ
  '\u09A8': ['n'],                   // ন
  '\u09AA': ['p'],                   // প
  '\u09AB': ['f', 'ph', 'p'],       // ফ
  '\u09AC': ['b', 'v', 'w'],        // ব — 'w' added: some BD romanizations
  '\u09AD': ['bh', 'v', 'b', 'w'], // ভ — 'w' added: Tanwir
  '\u09AE': ['m'],                   // ম
  '\u09AF': ['z', 'j', 'y'],        // য
  '\u09B0': ['r'],                   // র
  '\u09B2': ['l'],                   // ল
  '\u09B6': ['sh', 's'],            // শ
  '\u09B7': ['sh', 's'],            // ষ
  '\u09B8': ['s', 'sh'],            // স
  '\u09B9': ['h'],                   // হ
  '\u09DC': ['r', 'rr'],            // ড়
  '\u09DD': ['rh', 'r'],            // ঢ়
  '\u09DF': ['y', 'i'],             // য় — 'i' added: Baitul / Shahriar
  '\u09CE': ['t'],                   // ৎ
  '\u0982': ['ng', 'm'],            // ং
  '\u0983': ['h'],                   // ঃ
  '\u0981': ['n'],                   // ঁ
  // Vowel matras (diacritics)
  '\u09BE': ['a', 'aa'],            // া
  '\u09BF': ['i', 'ee'],            // ি
  '\u09C0': ['i', 'ee'],            // ী
  '\u09C1': ['u', 'oo', 'o'],       // ু — 'o' added: Comilla
  '\u09C2': ['u', 'oo', 'o'],       // ূ
  '\u09C3': ['ri'],                  // ৃ
  '\u09C7': ['e', 'a', 'ai'],       // ে — 'ai' added: হোসেন → Hossain
  '\u09C8': ['oi'],                  // ৈ
  '\u09CB': ['o', 'u'],             // ো
  '\u09CC': ['ou'],                  // ৌ
  '\u09CD': [''],                    // ্ (hasanta — suppresses inherent vowel)
};

// Reverse index: each Latin/Banglish token → Bengali chars.
const LATIN_TO_BN = {};
for (const [bn, latins] of Object.entries(BN_TO_LATIN)) {
  for (const latin of latins) {
    if (!latin) continue;
    if (!LATIN_TO_BN[latin]) LATIN_TO_BN[latin] = [];
    if (!LATIN_TO_BN[latin].includes(bn)) LATIN_TO_BN[latin].push(bn);
  }
}
// Multi-char Latin sequences → multi-char Bengali sequences (not covered by BN_TO_LATIN).
// "ain" is a common Arabic-origin suffix romanised as "ain" in English (Hossain, Hussain)
// but written as ে+ন (en) in Bengali script.
LATIN_TO_BN['ain'] = ['\u09C7\u09A8']; // েন

// Longest-first so "ng" beats "n"+"g", "ch" beats "c"+"h", etc.
// 'rh' and 'rr' removed: too ambiguous in common names (rahman = r+h, not ঢ়).
const LATIN_DIGRAPHS = [
  'chh', 'ain', 'ch', 'kh', 'gh', 'dh', 'bh', 'ph', 'jh', 'th', 'ng', 'sh',
  'oy', 'ou', 'ow', 'ee', 'oo', 'aa', 'oi',
];

// Bengali vowel diacritics (matras) and virama — these follow consonants.
const BENGALI_VOWEL_MATRAS = new Set([
  '\u09BE', '\u09BF', '\u09C0', '\u09C1', '\u09C2', '\u09C3',
  '\u09C7', '\u09C8', '\u09CB', '\u09CC',
  '\u09CD', // ্ hasanta / virama
  '\u0982', '\u0983', '\u0981',
]);

// Bengali standalone vowel letters.
const BENGALI_VOWELS_STANDALONE = new Set([
  '\u0985', '\u0986', '\u0987', '\u0988', '\u0989', '\u098A',
  '\u098B', '\u098F', '\u0990', '\u0993', '\u0994',
]);

/**
 * Manually compose decomposed Bengali characters.
 * JavaScript's String.normalize('NFC') does NOT compose Bengali nukta
 * combinations (e.g. য + ় → য়), so we do it here.
 */
function composeBengaliNukta(text) {
  return text
    .replace(/\u09AF\u09BC/g, '\u09DF') // য + ় → য়
    .replace(/\u09A1\u09BC/g, '\u09DC') // ড + ় → ড়
    .replace(/\u09A2\u09BC/g, '\u09DD'); // ঢ + ় → ঢ়
}

/**
 * Common Bengali conjunct consonants and matra+consonant sequences that
 * have non-obvious Latin romanisations, especially in Bangladeshi dialect.
 *
 * Key: the Bengali character sequence (2 or 3 chars).
 * Value: Latin romanisation alternatives (used as a regex alternation string).
 */
const BENGALI_CONJUNCTS = {
  // 3-char consonant clusters (consonant + ্ + consonant)
  '\u0995\u09CD\u09B7': 'ksh|kkh|kk',          // ক্ষ → ksh / kkh / kk
  '\u09A8\u09CD\u09AF': 'nno|nn|ny|nyo',        // ন্য → nno / nn / ny (অনন্য → Ononno)
  '\u09A8\u09CD\u09A8': 'nn|n',                  // ন্ন → nn / n
  '\u09A4\u09CD\u09A4': 'tt|t',                  // ত্ত → tt / t
  '\u09AE\u09CD\u09AE': 'mm|m',                  // ম্ম → mm (মোহাম্মদ → Mohammed)
  '\u09B8\u09CD\u09A4': 'st|sht',                // স্ত → st
  // 2-char sequences: vowel onset → Latin consonant
  '\u0993\u09DF': 'w|o',                         // ওয় → w (ওয়াহাব → Wahab)
  '\u0993\u09AF': 'w|o',                         // ওয → w (decomposed ওয)
  // 2-char sequences: matra + consonant (common Arabic-origin endings)
  '\u09C7\u09A8': 'en|ain|an|in',               // ে+ন → en/ain (হোসেন → Hossain)
};

const SATHI_KEYWORDS = ['sathi', 'saathi', 'jimmadar', 'সাথী', 'সাথি', 'জিম্মাদার'];
const STUDENT_KEYWORDS = ['student', 'chhatra', 'chhatro', 'ছাত্র', 'ছাত্রী'];

const PERSON_TEXT_FIELDS = [
  'name', 'masjid', 'houseLocation', 'schoolName',
  'fatherName', 'mobile', 'fatherMobile', 'profession',
];

const ACCOUNT_TEXT_FIELDS = ['name', 'masjid', 'houseAddress', 'mobile'];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasBengali(text) {
  // Bengali numerals (০-৯) alone should not trigger letter transliteration.
  const withoutBnDigits = String(text).replace(/[\u09E6-\u09EF]/g, '');
  return /[\u0980-\u09FF]/.test(withoutBnDigits);
}

function bengaliToLatin(text) {
  const composed = composeBengaliNukta(String(text));
  let out = '';
  for (const ch of composed) {
    if (BN_TO_LATIN[ch]) {
      out += BN_TO_LATIN[ch][0] || '';
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch;
    }
  }
  return out.toLowerCase();
}

/**
 * Normalize a name (Bengali or Latin) to a canonical phonetic key for
 * fuzzy in-memory comparison. Two names that sound the same in BD dialect
 * should produce identical or near-identical keys.
 *
 * Key rules applied:
 *  - ph → f
 *  - y/w glide between vowels removed  (nayem → naem, shawon → shaon)
 *  - w after vowel not before another vowel removed  (shaw → sha)
 *  - ae → ai  (naem → naim)
 *  - ee → i, oo → u, aa → a  (long vowels collapsed)
 *  - o → a  (BD inherent vowel ô normalised to a; kobir ≡ kabir)
 *  - consecutive duplicate chars collapsed  (hassan → hasan, mm → m)
 */
function normalizeSearchKey(text) {
  let s = bengaliToLatin(text);
  s = s.replace(/ph/g, 'f');
  // Remove y/w glide between two vowels
  s = s.replace(/([aeiou])y([aeiou])/g, '$1$2');
  s = s.replace(/([aeiou])w([aeiou])/g, '$1$2');
  // Remove w after vowel when NOT followed by another vowel
  s = s.replace(/([aeiou])w(?![aeiou])/g, '$1');
  // Vowel normalisations
  s = s.replace(/ae/g, 'ai');
  s = s.replace(/ee/g, 'i');
  s = s.replace(/oo/g, 'u');
  s = s.replace(/aa/g, 'a');
  // Normalise BD inherent vowel (ô ≈ o ≈ a)
  s = s.replace(/o/g, 'a');
  // Collapse consecutive duplicate chars (Hassan→Hasan, Mohammed→Mohamd)
  s = s.replace(/([a-z])\1+/g, '$1');
  s = s.replace(/[^a-z0-9\u0980-\u09FF]/g, '');
  return s;
}

function consonantSkeleton(text) {
  return normalizeSearchKey(text).replace(/[aeiouy]/g, '');
}

/**
 * Build a fuzzy character-class regex from a Latin query string.
 * Handles:
 *  - vowel class equivalences (a≈o, i≈e≈y, u≈o)
 *  - optional y/w glide between consecutive vowels (naim → Nayem)
 *  - skips glide consonants that are between two vowels in the source
 *  - allows {1,2} for consonants (hasan matches Hassan)
 */
function latinToFuzzyRegex(query) {
  let pattern = '';
  const q = query.toLowerCase();

  for (let i = 0; i < q.length; i++) {
    const ch = q[i];
    const prev = q[i - 1] || '';
    const next = q[i + 1] || '';
    const isVowel = (c) => /[aeiou]/.test(c);

    // Skip y/w glide between two vowels — the preceding vowel's [yw]? covers it.
    if ((ch === 'y' || ch === 'w') && isVowel(prev) && isVowel(next)) {
      continue;
    }

    if (ch === 'a' || ch === 'o') pattern += '[ao]';
    else if (ch === 'i') pattern += '[iey]';
    else if (ch === 'e') pattern += '[iey]';
    else if (ch === 'u') pattern += '[uo]';
    else if (ch === 'b') pattern += '[bvw]';
    else if (ch === 'v') pattern += '[vbw]';
    else if (ch === 'w') pattern += '[wvb]';
    else if (ch === 'f') pattern += '[fp]';
    else if (ch === 's') pattern += '[scsh]';
    else if (ch === 'z') pattern += '[zj]';
    else {
      // Consonants: allow 1-2 occurrences to match doubled forms (Hassan, Mohammed)
      const esc = escapeRegex(ch);
      pattern += /[a-z]/.test(ch) ? esc + '{1,2}' : esc;
    }

    // After a vowel: if the next meaningful char (past y/w) is also a vowel,
    // add optional glide to allow stored names like "Nayem" when querying "naim".
    if (isVowel(ch)) {
      let j = i + 1;
      while (j < q.length && (q[j] === 'y' || q[j] === 'w')) j++;
      if (isVowel(q[j] || '')) pattern += '[yw]?';
    }
  }
  return pattern;
}

/**
 * Build a fuzzy regex from Bengali text where each char is replaced by all
 * its Latin variants (and itself), so one pattern matches both Bengali-stored
 * and Latin-stored names.
 *
 * Enhanced for Bangladeshi romanisation:
 *  1. Nukta composition (decomposed য+়→ য̧) applied before processing.
 *  2. Known conjuncts (3-char and 2-char) replaced with multi-option patterns.
 *  3. After vowel/matra → next is also vowel/matra: [yw]? glide inserted.
 *  4. After consonant not followed by matra: [aoe]? inherent vowel inserted.
 *  5. Single-char consonant variants use {1,2} to allow doubling (Hassan).
 *  6. য/য় between two vowels is made optional (Shahriar ≡ Shahriyar).
 *  7. Word-final য gets extra 'o', 'a', 'no' variants (অনন্য → Ononno).
 *  8. Word-initial ই before য় is made optional (ইয়াসিন → Yasin).
 */
function bengaliToFuzzyRegex(query) {
  let pattern = '';
  const chars = [...composeBengaliNukta(String(query))];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    // ── Check 3-char conjuncts first ─────────────────────────────────────
    const conjunct3 = chars.slice(i, i + 3).join('');
    if (BENGALI_CONJUNCTS[conjunct3]) {
      const latin = BENGALI_CONJUNCTS[conjunct3];
      pattern += `(?:${escapeRegex(conjunct3)}|${latin})`;
      const charAfter = chars[i + 3];
      const afterIsMatra = charAfter && (BENGALI_VOWEL_MATRAS.has(charAfter) || BENGALI_VOWELS_STANDALONE.has(charAfter));
      if (charAfter && !afterIsMatra) pattern += '[aoe]?';
      i += 2; // skip ্ and second consonant
      continue;
    }

    // ── Check 2-char conjuncts ────────────────────────────────────────────
    const conjunct2 = chars.slice(i, i + 2).join('');
    if (BENGALI_CONJUNCTS[conjunct2]) {
      const latin = BENGALI_CONJUNCTS[conjunct2];
      pattern += `(?:${escapeRegex(conjunct2)}|${latin})`;
      const charAfter = chars[i + 2];
      const afterIsMatra = charAfter && (BENGALI_VOWEL_MATRAS.has(charAfter) || BENGALI_VOWELS_STANDALONE.has(charAfter));
      if (charAfter && !afterIsMatra) pattern += '[aoe]?';
      i += 1; // skip second char of the 2-char conjunct
      continue;
    }

    // ── Unknown char (not in BN_TO_LATIN) ────────────────────────────────
    if (!BN_TO_LATIN[ch]) {
      pattern += escapeRegex(ch);
      continue;
    }

    const allLatinVariants = BN_TO_LATIN[ch] || [];
    const latinVariants = [...new Set(allLatinVariants.filter(Boolean))];
    const isHashanta = allLatinVariants.length > 0 && allLatinVariants.every((v) => !v);

    // Hasanta (্) suppresses the inherent vowel; absent in Latin romanisation.
    if (isHashanta) {
      pattern += `(?:${escapeRegex(ch)})?`;
      continue;
    }

    // Word-initial ই before য় can be dropped in romanisation (ইয়াসিন → Yasin).
    if (ch === '\u0987' && i === 0 && (chars[1] === '\u09DF' || chars[1] === '\u09AF')) {
      const variants = [ch, ...latinVariants];
      pattern += `(?:${variants.map(escapeRegex).join('|')})?`; // optional!
      continue;
    }

    // Word-final য can sound like 'o'/'no' in BD colloquial speech.
    if (ch === '\u09AF' && !next) {
      latinVariants.push('o', 'a', 'no');
    }

    const isCurrentVowel = BENGALI_VOWEL_MATRAS.has(ch) || BENGALI_VOWELS_STANDALONE.has(ch);
    const isNextMatra = next && (BENGALI_VOWEL_MATRAS.has(next) || BENGALI_VOWELS_STANDALONE.has(next));
    const prevCh = chars[i - 1];
    const isPrevVowel = prevCh && (BENGALI_VOWEL_MATRAS.has(prevCh) || BENGALI_VOWELS_STANDALONE.has(prevCh));

    // য/য় acting as a glide between two vowels: make optional (Shahriar ≡ Shahriyar).
    if (!isCurrentVowel && isPrevVowel && isNextMatra && (ch === '\u09DF' || ch === '\u09AF')) {
      const variants = [ch, ...new Set(latinVariants)];
      pattern += `(?:${variants.map(escapeRegex).join('|')})?`; // optional glide
      continue;
    }

    // Build the variant pattern.
    // For single-char consonant Latin variants, allow {1,2} to match doubled forms.
    const variants = [ch, ...new Set(latinVariants)];
    const variantParts = variants.map((v) => {
      const esc = escapeRegex(v);
      if (v.length === 1 && /[a-z]/.test(v)) return esc + '{1,2}';
      return esc;
    });
    pattern += `(?:${variantParts.join('|')})`;

    // Rule 1: glide between consecutive vowels/matras.
    if (isCurrentVowel && isNextMatra) {
      pattern += '[yw]?';
    }

    // Rule 2: inherent vowel after consonant not followed by a matra.
    if (!isCurrentVowel && !isNextMatra && next) {
      pattern += '[aoe]?';
    }
  }
  return pattern;
}

function latinSegmentToFuzzyRegex(segment) {
  const bengaliChars = LATIN_TO_BN[segment] || [];
  if (!bengaliChars.length) return escapeRegex(segment);
  const variants = [...new Set([segment, ...bengaliChars])];
  return `(?:${variants.map(escapeRegex).join('|')})`;
}

/**
 * Maps a Latin/Banglish query to a regex that matches Bengali-script stored
 * names. Processes digraphs first (longest-match), then individual chars.
 *
 * Enhancements:
 *  - Consecutive consonants are deduplicated first so "Hassan" → "hasan"
 *    before lookup, preventing double-char patterns that miss Bengali text.
 *  - Short 'a'/'o' between two Latin consonants is made optional (inherent
 *    vowel): "rahman" matches Bengali "রহমান" where no explicit 'a' is written.
 */
function latinToBengaliFuzzyRegex(query) {
  // Deduplicate consecutive consonants so "hassan" → "hasan" before mapping.
  const deduped = String(query).toLowerCase().replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1');
  let pattern = '';
  let i = 0;

  while (i < deduped.length) {
    let segment = null;
    for (const digraph of LATIN_DIGRAPHS) {
      if (deduped.startsWith(digraph, i)) {
        segment = digraph;
        break;
      }
    }
    if (!segment) segment = deduped[i];
    i += segment.length;

    if (!/^[a-z]+$/.test(segment)) {
      pattern += escapeRegex(segment);
      continue;
    }

    // Short 'a'/'o' between two consonants → optional (inherent vowel position).
    const prev = deduped[i - segment.length - 1] || '';
    const next = deduped[i] || '';
    const isInherentVowelPos =
      (segment === 'a' || segment === 'o') &&
      /[bcdfghjklmnpqrstvwxyz]/.test(prev) &&
      /[bcdfghjklmnpqrstvwxyz]/.test(next);

    if (isInherentVowelPos) {
      pattern += `(?:${latinSegmentToFuzzyRegex(segment)})?`; // optional
    } else {
      pattern += latinSegmentToFuzzyRegex(segment);
    }
  }
  return pattern;
}

/**
 * Build a phonetic regex from a Latin transliteration that matches the wide
 * variety of Bangladeshi name romanisations.
 *
 * Handles:
 *  - a/o equivalence (BD inherent vowel):  a → [ao],  o → [ao]
 *  - i/e/y equivalence:                    i → [iey], e → [iey]
 *  - u/o equivalence:                      u → [uo]
 *  - optional y/w glide between vowels:    "naim" matches "nayem"
 *  - optional inherent vowel between consonants: "kbir" matches "kabir"/"kobir"
 *  - doubled consonants allowed via {1,2}
 */
function latinToPhoneticRegex(latin) {
  const s = String(latin).toLowerCase().replace(/[^a-z]/g, '');
  if (s.length < 2) return null;

  let pattern = '';
  const isVowel = (c) => /[aeiou]/.test(c);
  const isConsonant = (c) => c && /[a-z]/.test(c) && !isVowel(c);

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : '';
    const next = i < s.length - 1 ? s[i + 1] : '';

    // Skip y/w glide between two vowels.
    if ((ch === 'y' || ch === 'w') && isVowel(prev) && isVowel(next)) {
      continue;
    }

    if (ch === 'a' || ch === 'o') {
      pattern += '[ao]';
      if (isVowel(next) || next === 'y' || next === 'w') pattern += '[yw]?';
    } else if (ch === 'i' || ch === 'e') {
      pattern += '[iey]';
      if (isVowel(next) || next === 'y' || next === 'w') pattern += '[yw]?';
    } else if (ch === 'u') {
      pattern += '[uo]';
      if (isVowel(next) || next === 'y' || next === 'w') pattern += '[yw]?';
    } else {
      const esc = escapeRegex(ch);
      if (isConsonant(ch) && isConsonant(next)) {
        // Between two consonants: optional inherent vowel AND allow doubling.
        pattern += esc + '{1,2}' + '[aoe]?';
      } else {
        // All other consonants: allow 1-2 occurrences (Hassan, Mohammed).
        pattern += esc + '{1,2}';
      }
    }
  }

  return pattern || null;
}

function expandSearchPatterns(query) {
  const q = String(query).trim();
  if (!q) return [];

  const patterns = new Set();
  patterns.add(escapeRegex(q));

  if (hasBengali(q)) {
    patterns.add(bengaliToFuzzyRegex(q));
    const latin = bengaliToLatin(q);
    if (latin.length >= 1) {
      patterns.add(escapeRegex(latin));
      if (latin.length >= 2) {
        patterns.add(latinToFuzzyRegex(latin));
        const phonetic = latinToPhoneticRegex(latin);
        if (phonetic) patterns.add(phonetic);
      }
    }
  } else {
    const lower = q.toLowerCase();
    patterns.add(escapeRegex(lower));
    patterns.add(latinToBengaliFuzzyRegex(q));
    if (q.length >= 2) {
      patterns.add(latinToFuzzyRegex(q));
      const phonetic = latinToPhoneticRegex(q);
      if (phonetic) patterns.add(phonetic);
    }
  }

  const asciiDigits = extractAsciiDigits(q);
  const minDigitLen = isDigitOnlyQuery(q) ? 1 : 3;
  if (asciiDigits.length >= minDigitLen) {
    patterns.add(escapeRegex(asciiDigits));
    const crossScript = buildCrossScriptDigitRegex(asciiDigits);
    if (crossScript) patterns.add(crossScript);
  }

  return [...patterns].filter(Boolean);
}

function buildRegexOrConditions(fields, query) {
  const patterns = expandSearchPatterns(query);
  const conditions = [];
  for (const field of fields) {
    for (const pattern of patterns) {
      conditions.push({ [field]: { $regex: pattern, $options: 'i' } });
    }
  }
  return conditions;
}

function matchesTypeKeyword(type, query) {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const keywords = type === 'sathi' ? SATHI_KEYWORDS : type === 'student' ? STUDENT_KEYWORDS : [];
  return keywords.some((kw) => {
    const k = kw.toLowerCase();
    if (q.includes(k)) return true;
    if (q.length >= 2 && k.startsWith(q)) return true;
    return false;
  });
}

function queryMatchesSathiKeyword(query) {
  return matchesTypeKeyword('sathi', query);
}

function queryMatchesStudentKeyword(query) {
  return matchesTypeKeyword('student', query);
}

// Cached compiled patterns per query.
const _patternCache = new Map();
function getPatternsForQuery(q) {
  if (_patternCache.has(q)) return _patternCache.get(q);
  const patterns = expandSearchPatterns(q).map((p) => {
    try { return new RegExp(p, 'i'); } catch { return null; }
  }).filter(Boolean);
  if (_patternCache.size > 200) _patternCache.clear();
  _patternCache.set(q, patterns);
  return patterns;
}

function scoreFieldMatch(fieldValue, query) {
  if (fieldValue == null || fieldValue === '') return 0;
  const value = String(fieldValue).trim();
  const q = String(query).trim();
  if (!value || !q) return 0;

  const valueLower = value.toLowerCase();
  const qLower = q.toLowerCase();

  if (value === q || valueLower === qLower) return 100;
  if (valueLower.startsWith(qLower) || value.startsWith(q)) return 92;
  if (valueLower.includes(qLower) || value.includes(q)) return 84;

  const queryDigits = extractAsciiDigits(q);
  const minDigitLen = isDigitOnlyQuery(q) ? 1 : 3;
  if (queryDigits.length >= minDigitLen) {
    const valueDigits = extractAsciiDigits(value);
    if (valueDigits.includes(queryDigits)) return 82;
  }

  const normValue = normalizeSearchKey(value);
  const normQuery = normalizeSearchKey(q);
  if (!normQuery && queryDigits.length < minDigitLen) return 0;

  if (!normQuery) {
    // Digit-only Bengali query already handled above; try regex fallback.
    const patterns = getPatternsForQuery(q);
    for (const re of patterns) {
      if (re.test(value)) return 64;
    }
    return 0;
  }

  if (normValue === normQuery) return 96;
  if (normValue.startsWith(normQuery)) return 88;
  if (normValue.includes(normQuery)) return 76;

  const skValue = consonantSkeleton(value);
  const skQuery = consonantSkeleton(q);
  if (skQuery.length >= 2 && skValue.includes(skQuery)) return 68;

  // Cross-script regex check as final fallback.
  const patterns = getPatternsForQuery(q);
  for (const re of patterns) {
    if (re.test(value)) return 64;
  }

  return 0;
}

function getPersonSearchableFields(entry) {
  return [
    { value: entry.name, weight: 1 },
    { value: entry.masjid, weight: 0.95 },
    { value: entry.houseLocation, weight: 0.9 },
    { value: entry.schoolName, weight: 0.95 },
    { value: entry.fatherName, weight: 0.92 },
    { value: entry.mobile, weight: 0.88 },
    { value: entry.fatherMobile, weight: 0.88 },
    { value: entry.profession, weight: 0.85 },
  ];
}

function getAccountSearchableFields(entry) {
  return [
    { value: entry.name, weight: 1 },
    { value: entry.masjid, weight: 0.95 },
    { value: entry.houseAddress, weight: 0.9 },
    { value: entry.mobile, weight: 0.88 },
  ];
}

function scoreDirectoryEntry(entry, query) {
  const q = String(query).trim();
  if (!q) return 0;

  let maxScore = 0;
  const fields =
    entry.source === 'account'
      ? getAccountSearchableFields(entry)
      : getPersonSearchableFields(entry);

  for (const { value, weight } of fields) {
    if (value == null || value === '') continue;
    const fieldScore = scoreFieldMatch(value, q);
    if (fieldScore > 0) {
      maxScore = Math.max(maxScore, Math.round(fieldScore * weight));
    }
  }

  if (matchesTypeKeyword(entry.type, q)) {
    maxScore = Math.max(maxScore, 72);
  }

  return maxScore;
}

function entryMatchesQuery(entry, query) {
  return scoreDirectoryEntry(entry, query) > 0;
}

module.exports = {
  PERSON_TEXT_FIELDS,
  ACCOUNT_TEXT_FIELDS,
  buildRegexOrConditions,
  expandSearchPatterns,
  scoreDirectoryEntry,
  entryMatchesQuery,
  matchesTypeKeyword,
  queryMatchesSathiKeyword,
  queryMatchesStudentKeyword,
  normalizeSearchKey,
};
