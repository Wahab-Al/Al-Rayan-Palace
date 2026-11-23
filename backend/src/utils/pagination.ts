/** Parses canonical positive integer query parameters with an explicit upper bound. */
export function parseBoundedQueryInteger(
  value: unknown,
  fallback: number,
  maximum: number,
): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum || String(parsed) !== value) {
    return null;
  }

  return parsed;
}
