export function getHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseGdeltDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(value);
  if (!match) return parseDate(value);

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  if (Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() + 1 !== Number(month) ||
      date.getUTCDate() !== Number(day) ||
      date.getUTCHours() !== Number(hour) ||
      date.getUTCMinutes() !== Number(minute) ||
      date.getUTCSeconds() !== Number(second)) {
    return null;
  }
  return date;
}

export function reconstructOpenAlexAbstract(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";

  const wordsAtPosition: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(value)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (Number.isInteger(position) && position >= 0 && position < 50000) {
        wordsAtPosition.push([position, word]);
      }
    }
  }

  wordsAtPosition.sort(([left], [right]) => left - right);
  return wordsAtPosition.map(([, word]) => word).join(" ");
}
