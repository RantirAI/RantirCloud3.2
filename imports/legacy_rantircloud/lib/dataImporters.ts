import Papa from 'papaparse';
import { read, utils } from 'xlsx';

export interface ImportedDataset {
  name: string;
  fields: string[];
  rows: any[];
  source: string; // e.g., 'spreadsheet', 'google-sheets'
}

export function parseCSVText(text: string): { rows: any[]; fields: string[] } {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows: any[] = Array.isArray(result.data) ? (result.data as any[]) : [];
  const fields: string[] = rows.length > 0 ? Object.keys(rows[0]) : (result.meta?.fields || []);
  return { rows, fields };
}

export async function parseSpreadsheetFile(file: File): Promise<{ rows: any[]; fields: string[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCSVText(text);
  }

  // Fallback to XLSX parsing
  const buf = await file.arrayBuffer();
  const wb = read(buf, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const json = utils.sheet_to_json(ws, { defval: '' });
  const rows: any[] = json as any[];
  const fields: string[] = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { rows, fields };
}

export function toGoogleSheetCSVUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('docs.google.com')) return null;
    // Pattern: https://docs.google.com/spreadsheets/d/{id}/edit#gid={gid}
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('d');
    const id = idx !== -1 && parts[idx + 1] ? parts[idx + 1] : null;
    const gid = u.hash.startsWith('#gid=') ? u.hash.replace('#gid=', '') : (u.searchParams.get('gid') || null);
    if (!id) return null;
    const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    return gid ? `${base}&gid=${gid}` : base;
  } catch {
    return null;
  }
}
