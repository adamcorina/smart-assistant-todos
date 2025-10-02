const { v4: uuidv4 } = require('uuid');
const { withNotes } = require('../repositories/notes');

const MAX_TEXT_LENGTH = 4000;

function nowIso() { return new Date().toISOString(); }

async function addNote(text) {
  if (typeof text !== 'string') throw new Error('text must be string');
  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);
  return withNotes(notes => {
    const newNote = {
      id: uuidv4(),
      text: trimmed,
      status: 'TODO',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    notes.push(newNote);
    return notes;
  });
}
async function listNotes({ filter = 'all', limit = null } = {}) {
  const notes = await withNotes(() => {});
  let res = notes.slice();
  if (filter === 'TODO') res = res.filter(n => n.status === 'TODO');
  else if (filter === 'DONE') res = res.filter(n => n.status === 'DONE');
  else if (typeof filter === 'string' && filter.startsWith('recent:')) {
    const n = parseInt(filter.split(':')[1], 10) || 0;
    if (n > 0) res = res.slice(-n);
  }
  if (Number.isInteger(limit) && limit != null) res = res.slice(0, limit);
  return res;
}

async function updateNote(id, { text = null, status = null } = {}) {
  if (typeof id !== 'string') throw new Error('id must be string');
  return withNotes(notes => {
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) throw new Error('note not found');
    if (text !== null) {
      if (typeof text !== 'string') throw new Error('text must be string or null');
      notes[idx].text = text.trim().slice(0, MAX_TEXT_LENGTH);
    }
    if (status !== null) {
      if (status !== 'TODO' && status !== 'DONE') throw new Error('invalid status');
      notes[idx].status = status;
    }
    notes[idx].updated_at = nowIso();
    return notes;
  });
}

async function deleteNote(id) {
  if (typeof id !== 'string') throw new Error('id must be string');
  return withNotes(notes => {
    const newNotes = notes.filter(n => n.id !== id);
    if (newNotes.length === notes.length) throw new Error('note not found');
    // Mutate the original array for persistence
    return newNotes;
  });
}

module.exports = { addNote, listNotes, updateNote, deleteNote };