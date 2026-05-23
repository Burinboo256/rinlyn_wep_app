export function normalizeThaiId(nid: string): string {
  return nid.replace(/[-\s]/g, '');
}

export function validateThaiId(nid: string): boolean {
  const clean = normalizeThaiId(nid);
  if (!/^\d{13}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(clean[i]) * (13 - i);
  return ((11 - (sum % 11)) % 10) === Number(clean[12]);
}
