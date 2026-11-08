const topicTerms = [
  "humanoid robot",
  "humanoid robots",
  "psychological",
  "psychological treatments",
  "mental health",
  "mental",
  "treatment",
  "หุ่นยนต์ฮิวแมนนอยด์",
  "หุ่นยนต์คล้ายมนุษย์",
  "หุ่นยนต์มนุษย์",
  "จิตวิทยา",
  "การรักษาทางจิต",
  "การบำบัดทางจิต",
  "สุขภาพจิต",
  "จิต",
  "การรักษา"
];

const psychologicalKeywordTerms = [
  "psychological",
  "จิตวิทยา",
  "การรักษาทางจิต",
  "การบำบัดทางจิต"
];

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function containsTerm(text: string, term: string) {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (!normalizedText || !normalizedTerm) return false;

  if (/^[\x00-\x7f]+$/.test(term)) {
    return ` ${normalizedText} `.includes(` ${normalizedTerm} `);
  }
  return normalizedText.includes(normalizedTerm);
}

export function isThaiJoTopicMatch(text: string) {
  return topicTerms.some((term) => containsTerm(text, term));
}

export function hasThaiJoPsychologicalKeyword(keywords: string) {
  return psychologicalKeywordTerms.some((term) => containsTerm(keywords, term));
}