import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RECORDS_PATH = path.resolve(__dirname, '../data/records.json');

// Public codes are the only lookup key exposed. Format is fixed so a malformed
// or probing request is rejected before it can reach the store.
const CODE_PATTERN = /^NV-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

let cache = null;
let cacheMtime = 0;

function loadRecords() {
  const { mtimeMs } = fs.statSync(RECORDS_PATH);
  if (!cache || mtimeMs !== cacheMtime) {
    cache = JSON.parse(fs.readFileSync(RECORDS_PATH, 'utf8'));
    cacheMtime = mtimeMs;
  }
  return cache.records || {};
}

export function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const code = normalizeCode(req.params?.code);

    if (!CODE_PATTERN.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Cod invalid. Formatul este NV-XXXX-XXXX.'
      });
    }

    const record = loadRecords()[code];

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Nu există nicio fișă cu acest cod.'
      });
    }

    // The full VIN stays server-side: the public page shows only the masked
    // form, so a scraped code cannot be turned into a VIN lookup elsewhere.
    const { vin, ...publicRecord } = record;

    return res.status(200).json({ success: true, record: publicRecord });
  } catch (error) {
    console.error('Error reading finish record:', error);
    return res.status(500).json({ success: false, message: 'Eroare la citirea fișei' });
  }
}
