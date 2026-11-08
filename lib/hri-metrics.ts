export const hriOutcomes = ["positive", "negative", "mixed", "neutral", "unclear"] as const;
export type HriOutcome = (typeof hriOutcomes)[number];

export type HriOutcomeRecord = {
  year: number | null;
  outcome: string;
};

export type HriOutcomeCounts = Record<HriOutcome, number>;
export type YearlyHriOutcomeCounts = HriOutcomeCounts & { year: number };

function isHriOutcome(value: string): value is HriOutcome {
  return hriOutcomes.includes(value as HriOutcome);
}

function emptyOutcomeCounts(): HriOutcomeCounts {
  return { positive: 0, negative: 0, mixed: 0, neutral: 0, unclear: 0 };
}

export function countHriOutcomes(records: HriOutcomeRecord[]) {
  const total = emptyOutcomeCounts();
  const yearly = new Map<number, YearlyHriOutcomeCounts>();

  for (const record of records) {
    const outcome = isHriOutcome(record.outcome) ? record.outcome : "unclear";
    total[outcome] += 1;

    if (record.year === null || !Number.isInteger(record.year)) continue;
    const yearCounts = yearly.get(record.year) ?? { year: record.year, ...emptyOutcomeCounts() };
    yearCounts[outcome] += 1;
    yearly.set(record.year, yearCounts);
  }

  return {
    total,
    yearly: [...yearly.values()].sort((left, right) => left.year - right.year)
  };
}

export type ClassificationMetrics = {
  accuracy: number;
  labels: Array<{
    label: string;
    support: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
  macro: { precision: number; recall: number; f1: number };
};

export function evaluateClassification(
  expected: string[],
  predicted: string[],
  labels: string[]
): ClassificationMetrics {
  if (expected.length !== predicted.length) {
    throw new Error("Expected and predicted classifications must have the same length.");
  }
  if (!labels.length || new Set(labels).size !== labels.length) {
    throw new Error("Classification labels must be a non-empty list of unique values.");
  }

  const labelSet = new Set(labels);
  if (expected.some((value) => !labelSet.has(value)) || predicted.some((value) => !labelSet.has(value))) {
    throw new Error("Every expected and predicted classification must be a declared label.");
  }

  const labelMetrics = labels.map((label) => {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    for (let index = 0; index < expected.length; index += 1) {
      if (expected[index] === label && predicted[index] === label) truePositive += 1;
      else if (expected[index] !== label && predicted[index] === label) falsePositive += 1;
      else if (expected[index] === label && predicted[index] !== label) falseNegative += 1;
    }

    const precision = truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 0;
    const recall = truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      label,
      support: expected.filter((value) => value === label).length,
      precision,
      recall,
      f1
    };
  });

  const average = (key: "precision" | "recall" | "f1") =>
    labelMetrics.reduce((sum, metric) => sum + metric[key], 0) / labelMetrics.length;

  return {
    accuracy: expected.length
      ? expected.filter((value, index) => value === predicted[index]).length / expected.length
      : 0,
    labels: labelMetrics,
    macro: {
      precision: average("precision"),
      recall: average("recall"),
      f1: average("f1")
    }
  };
}
