export function copySorted<T>(items: readonly T[], compareFn: (a: T, b: T) => number): T[] {
  // Keep immutable sorting compatible with ES2020 runtimes instead of requiring Array.prototype.toSorted.
  return [...items].sort(compareFn);
}
