const fs = require('fs').promises;
const path = require('path');
const DB_PATH = path.resolve(__dirname, '../storage/notes.json');

class Mutex {
  constructor() { this._queue = []; this._locked = false; }
  lock() { return new Promise(resolve => { if (!this._locked) { this._locked = true; resolve(); } else { this._queue.push(resolve); } }); }
  unlock() { if (this._queue.length > 0) { const next = this._queue.shift(); next(); } else { this._locked = false; } }
}
const LOCK = new Mutex();

async function withNotes(callback) {
  await LOCK.lock();
  try {
    let notes;
    try {
      const raw = await fs.readFile(DB_PATH, 'utf8');
      notes = JSON.parse(raw || '[]');
      if (!Array.isArray(notes)) notes = [];
    } catch (e) {
      if (e.code === 'ENOENT') notes = [];
      else throw e;
    }
    const result = await callback(notes);
    if (typeof result !== 'undefined') {
      await fs.writeFile(DB_PATH, JSON.stringify(result, null, 2), 'utf8');
      return result;
    } else {
      // Read-only: do not write, just return notes
      return notes;
    }
  } finally {
    LOCK.unlock();
  }
}

module.exports = { withNotes };