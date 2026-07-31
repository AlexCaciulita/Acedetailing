/* Flat-file store for the admin dashboard.
   Shaped like the tables it will become, so moving to a real database later is a
   migration rather than a rewrite. Writes are atomic (temp file + rename) so an
   interrupted process cannot leave a half-written collection behind. */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = process.env.NOVA_DATA_DIR
  ? path.resolve(process.env.NOVA_DATA_DIR)
  : path.resolve(__dirname, '../../data');

// Every collection is an object keyed by id, matching data/records.json.
export const COLLECTIONS = {
  customers: 'customers.json',
  vehicles: 'vehicles.json',
  jobs: 'jobs.json',
  tasks: 'tasks.json',
  bookings: 'bookings.json',
  messages: 'messages.json',
  enrollments: 'enrollments.json',
  inventory: 'inventory.json',
  opportunities: 'opportunities.json',
  activities: 'activities.json',
  settings: 'settings.json'
};

const caches = new Map();

function filePath(name) {
  const file = COLLECTIONS[name];
  if (!file) throw new Error(`Colecție necunoscută: ${name}`);
  return path.join(DATA_DIR, file);
}

export function read(name) {
  const target = filePath(name);

  if (!fs.existsSync(target)) return {};

  const { mtimeMs } = fs.statSync(target);
  const cached = caches.get(name);
  if (cached && cached.mtime === mtimeMs) return cached.data;

  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  caches.set(name, { mtime: mtimeMs, data });
  return data;
}

export function write(name, data) {
  const target = filePath(name);
  fs.mkdirSync(DATA_DIR, { recursive: true });

  // Unique temp name so two concurrent writes cannot collide on it.
  const tmp = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, target);

  caches.set(name, { mtime: fs.statSync(target).mtimeMs, data });
  return data;
}

export function list(name) {
  return Object.values(read(name));
}

export function get(name, id) {
  return read(name)[id] || null;
}

export function nextId(prefix) {
  // Time-ordered so a plain key sort is also chronological, plus entropy so two
  // records created in the same millisecond cannot collide.
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

export function create(name, prefix, payload) {
  const data = read(name);
  const id = nextId(prefix);
  const now = new Date().toISOString();
  data[id] = { ...payload, id, createdAt: now, updatedAt: now };
  write(name, data);
  return data[id];
}

export function update(name, id, patch) {
  const data = read(name);
  if (!data[id]) return null;
  // id and createdAt are not client-writable.
  const { id: _ignoredId, createdAt: _ignoredCreated, ...safe } = patch;
  data[id] = { ...data[id], ...safe, updatedAt: new Date().toISOString() };
  write(name, data);
  return data[id];
}

export function remove(name, id) {
  const data = read(name);
  if (!data[id]) return false;
  delete data[id];
  write(name, data);
  return true;
}

/* Appended by the public site handlers (bookings, messages, enrollments), which
   run outside the admin session — kept separate so it is obvious at the call
   site that this path is reachable unauthenticated. */
export function append(name, prefix, payload) {
  return create(name, prefix, payload);
}
