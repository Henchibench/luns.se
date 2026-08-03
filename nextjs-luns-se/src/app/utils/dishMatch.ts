/**
 * Recognising the same dish across weeks.
 *
 * Menu descriptions are long and written differently by every restaurant —
 * "Murgh Masala – Indisk gryta med kyckling serveras med basmatiris…",
 * "SWEDISH CHEESE: Vår himmelskt krämiga ostsås…", "A2 - 15st Dumplings…".
 * Comparing them whole is hopeless: dishes that share a kitchen's boilerplate
 * ("Wokad kyckling med grönsaker … serveras med jasminris & koriander") look
 * nearly identical while being different dishes.
 *
 * What holds across every restaurant in the data is that the *name* comes
 * first, before a separator. Reducing a description to that leading segment
 * turns ~86-character descriptions into ~17-character names and makes
 * comparison tractable.
 */

// Order matters: try the explicit separators before falling back to prose.
const SEPARATORS = /\s[–—]\s|\s-\s|:|,/;

/**
 * "serveras med" always introduces accompaniments, never part of the name, so
 * it is cut unconditionally. Without that, "Bakad kolja serveras med hackat
 * ägg, bacon" and "Bakad kolja serveras med dillkokt potatis, svampsås" reduce
 * to different signatures purely because the first comma falls in a different
 * place.
 */
const SERVED_WITH = /\s+serveras\s+med\s+/i;

/** " med " often *is* part of a name ("Tortellini med ricotta"), so it is only
 * cut when the leading segment is still long enough to be a whole sentence. */
const PROSE_FALLBACK = /\s+med\s+|\s+på\s+/i;
const PROSE_FALLBACK_THRESHOLD = 40;

/**
 * Words that change what you are actually eating. Two dishes whose names
 * differ only by one of these are variants, not the same dish — "dumplings i
 * biffsoppa (fläsk)" is not "…(nöt)", and "fried rice … kyckling" is not
 * "… oumph".
 */
const PROTEIN_WORDS = [
  'kyckling', 'chicken', 'fläsk', 'fläskfilé', 'nöt', 'nötkött', 'biff', 'högrev',
  'lax', 'torsk', 'sej', 'kolja', 'spätta', 'räkor', 'skaldjur', 'fisk',
  'tofu', 'quorn', 'oumph', 'halloumi', 'haloumi', 'chèvre', 'vegetarisk',
  'vegansk', 'vegan', 'veg',
];

/** Similarity below which two protein words count as different things. */
const PROTEIN_SAME_THRESHOLD = 0.7;

/**
 * Dice coefficient over character bigrams. Cheap, no dependencies, and
 * forgiving of the transpositions and dropped letters that real menu typos
 * consist of.
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };

  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  let shared = 0;
  let aTotal = 0;
  aGrams.forEach((count, gram) => {
    aTotal += count;
    shared += Math.min(count, bGrams.get(gram) ?? 0);
  });
  let bTotal = 0;
  bGrams.forEach(count => { bTotal += count; });

  return (2 * shared) / (aTotal + bTotal);
}

/** Reduce a menu description to a comparable dish name. */
export function dishSignature(description: string): string {
  let text = description;

  text = text.replace(/\((?:\s*[GLNV]\s*)(?:,\s*[GLNV]\s*)*\)/g, ' '); // (G), (G, L)
  text = text.replace(/\(?\s*\d{2,4}\s*(kr|:-)\s*\)?/gi, ' ');         // 140 kr, (159 kr)
  text = text.replace(/^\s*[A-Z]?\d{1,2}\s*[-–]\s*/, '');              // menu codes "A2 - "
  text = text.replace(/^\s*(VEG|VEGAN)\s+/i, '');                      // variant prefix

  let head = text.split(SEPARATORS)[0] ?? '';
  head = head.split(SERVED_WITH)[0] ?? head;
  if (head.length > PROSE_FALLBACK_THRESHOLD) {
    head = head.split(PROSE_FALLBACK)[0] ?? head;
  }

  return head
    .toLowerCase()
    .replace(/[^\wåäöéèü ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function digitsIn(signature: string): string {
  return (signature.match(/\d+/g) ?? []).sort().join(',');
}

function proteinsIn(signature: string): string[] {
  const words = signature.split(' ');
  return PROTEIN_WORDS.filter(p => words.includes(p));
}

/**
 * Do two protein sets describe the same thing? Compared fuzzily so that a
 * misspelling ("haloumi" for "halloumi") does not read as a different dish —
 * which a plain set comparison would.
 */
function sameProteins(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(word => b.some(other => similarity(word, other) >= PROTEIN_SAME_THRESHOLD));
}

/**
 * Similarity above which two dish names are treated as the same dish.
 * Calibrated against the real menu corpus — see scripts/check_dish_match.mjs.
 */
export const MATCH_THRESHOLD = 0.88;

export function signaturesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  // Portion sizes and piece counts are part of the dish's identity
  if (digitsIn(a) !== digitsIn(b)) return false;

  if (!sameProteins(proteinsIn(a), proteinsIn(b))) return false;

  return similarity(a, b) >= MATCH_THRESHOLD;
}

/** Convenience: compare two raw menu descriptions. */
export function dishesMatch(a: string, b: string): boolean {
  return signaturesMatch(dishSignature(a), dishSignature(b));
}
