export function countTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
export function perUser(rows: { user: string; text: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.user, (m.get(r.user) ?? 0) + countTokens(r.text));
  return m;
}
