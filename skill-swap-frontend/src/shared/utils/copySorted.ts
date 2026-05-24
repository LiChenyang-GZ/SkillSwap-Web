export function copySorted<T>(items: readonly T[], compareFn: (a: T, b: T) => number): T[] {
  return [...items].sort(compareFn);
}
