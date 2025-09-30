/*
Node.js (Express) implementation of an LLM-driven Notes CRUD assistant.

This file contains:
- short design explanation & system prompt
- data model
- safe LLM-to-function loop
- persistence (JSON file)
- simple in-process mutex for safe writes
- placeholder `callLLM()` to wire your LLM provider (OpenAI, HuggingFace, local LLM, etc.)

Endpoints:
  POST /message  -> { text: string }  (LLM decides action; server executes)

Replace the callLLM() implementation with your provider. Validate LLM outputs strictly!
*/

require('dotenv').config(); 
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Ollama } = require('ollama'); // CommonJS
const client = new Ollama({ host: 'http://127.0.0.1:11434' });

// ---------------------------
// Configuration & constants
// ---------------------------
const DB_PATH = path.resolve(__dirname, 'notes_store.json');
const PORT = process.env.PORT || 3000;
const MAX_TEXT_LENGTH = 4000;

// System prompt (send to LLM). Keep it short and prescriptive.
const SYSTEM_PROMPT = `You are a Notes Assistant. You MUST respond with a JSON object matching exactly one of the allowed actions below.
Allowed actions: add_note, list_notes, update_note, delete_note, no_op.

Schemas (exact shape):
- add_note -> {"action":"add_note","args":{"text":"<note text>"}}
- list_notes -> {"action":"list_notes","args":{"filter":"all"|"TODO"|"DONE"|"recent:N","limit": integer|null}}
- update_note -> {"action":"update_note","args":{"id":"<note id>","text":"<new text>|null","status":"TODO"|"DONE"|null}}
- delete_note -> {"action":"delete_note","args":{"id":"<note id>"}}
- no_op -> {"action":"no_op","args":{"message":"<informational message>"}}

Rules:
- Respond with exactly one JSON object and no additional text.
- Use existing note IDs when referencing notes. If the user didn't provide an ID but intent implies update/delete, return list_notes so the app can prompt.
- Trim text, max length ${MAX_TEXT_LENGTH} characters.
- When unsure return no_op with a clarifying message.
`;

// ---------------------------
// Simple in-process mutex
// ---------------------------
class Mutex {
  constructor(){
    this._queue = [];
    this._locked = false;
  }
  lock(){
    return new Promise(resolve => {
      if(!this._locked){
        this._locked = true;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }
  unlock(){
    if(this._queue.length > 0){
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}
const LOCK = new Mutex();

// ---------------------------
// Data model helpers
// ---------------------------
function nowIso(){
  return new Date().toISOString();
}

async function loadNotes(){
  try{
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const arr = JSON.parse(raw || '[]');
    // Basic validation: ensure array of objects
    if(!Array.isArray(arr)) return [];
    return arr;
  }catch(e){
    if(e.code === 'ENOENT') return [];
    throw e;
  }
}

async function saveNotes(notes){
  await fs.writeFile(DB_PATH, JSON.stringify(notes, null, 2), 'utf8');
}

// ---------------------------
// CRUD operations
// ---------------------------
async function addNote(text){
  if(typeof text !== 'string') throw new Error('text must be string');
  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);
  await LOCK.lock();
  try{
    const notes = await loadNotes();
    const newNote = {
      id: uuidv4(),
      text: trimmed,
      status: 'TODO',
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    notes.push(newNote);
    await saveNotes(notes);
    return newNote;
  }finally{
    LOCK.unlock();
  }
}

async function listNotes({ filter = 'all', limit = null } = {}){
  const notes = await loadNotes();
  let res = notes.slice(); // preserve order (append order)
  if(filter === 'TODO') res = res.filter(n => n.status === 'TODO');
  else if(filter === 'DONE') res = res.filter(n => n.status === 'DONE');
  else if(typeof filter === 'string' && filter.startsWith('recent:')){
    const n = parseInt(filter.split(':')[1], 10) || 0;
    if(n > 0) res = res.slice(-n);
  }
  if(Number.isInteger(limit) && limit != null) res = res.slice(0, limit);
  return res;
}

async function updateNote(id, { text = null, status = null } = {}){
  if(typeof id !== 'string') throw new Error('id must be string');
  await LOCK.lock();
  try{
    const notes = await loadNotes();
    const idx = notes.findIndex(n => n.id === id);
    if(idx === -1) throw new Error('note not found');
    if(text !== null){
      if(typeof text !== 'string') throw new Error('text must be string or null');
      notes[idx].text = text.trim().slice(0, MAX_TEXT_LENGTH);
    }
    if(status !== null){
      if(status !== 'TODO' && status !== 'DONE') throw new Error('invalid status');
      notes[idx].status = status;
    }
    notes[idx].updated_at = nowIso();
    await saveNotes(notes);
    return notes[idx];
  }finally{
    LOCK.unlock();
  }
}

async function deleteNote(id){
  if(typeof id !== 'string') throw new Error('id must be string');
  await LOCK.lock();
  try{
    const notes = await loadNotes();
    const newNotes = notes.filter(n => n.id !== id);
    if(newNotes.length === notes.length) throw new Error('note not found');
    await saveNotes(newNotes);
  }finally{
    LOCK.unlock();
  }
}

// ---------------------------
// LLM interface (placeholder)
// ---------------------------
// IMPORTANT: Replace callLLM with your provider integration. The LLM MUST return
// a strict object: { action: "add_note"|"list_notes"|"update_note"|"delete_note"|"no_op", args: {...} }
// Validate the returned structure before executing.

async function callLLM(systemPrompt, userMessage, context){
  /*
    Example: Implement using OpenAI function-calling, or structured JSON output from a local LLM.
    The function should return a plain JS object, e.g.
      { action: 'add_note', args: { text: 'Buy milk' } }

    For safety:
      - Do NOT accept raw text instructions from the LLM to mutate the DB.
      - Accept only the allowed actions and typed args.
  */
  const notesSnapshot = (context && context.notes_snapshot) ? JSON.stringify(context.notes_snapshot) : "[]";
  const schema = {
    "title": "NotesAction",
    "type": "object",
    "required": ["action", "args"],
    "properties": {
      "action": {
        "type": "string",
        "enum": ["add_note", "list_notes", "update_note", "delete_note", "no_op"]
      },
      "args": {
        "type": "object",
        "properties": {
          "text": { "type": ["string", "null"], "minLength": 1, "maxLength": 4000 }, 
          "filter": { "type": ["string", "null"], "enum": ["all", "TODO", "DONE", null] },
          "limit": { "type": ["integer", "null"], "minimum": 1 },
          "id": {
            "type": ["string", "null"],
            "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
          },
          "status": { "type": ["string", "null"], "enum": ["TODO", "DONE", null] },
          "message": { "type": ["string", "null"], "maxLength": 1000 }
        },
        "additionalProperties": false
      }
    },
    "additionalProperties": false
  };

  const res = await client.chat({
    model: "gemma3:1b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${userMessage}\n\nNotes snapshot:\n${notesSnapshot}` }
    ],
    stream: false,
    temperature: 0,
    format: schema,
  });

  // res.message.content should contain the assistant's string
  const content = res?.message?.content ?? "";
  try { return JSON.parse(content); } catch(e) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch(_) {}
    return { action: "no_op", args: { message: "Could not parse LLM output." } };
  }
}

// ---------------------------
// Validation helper for LLM output
// ---------------------------
function validateLLMResult(obj){
  if(!obj || typeof obj !== 'object') return { ok: false, error: 'not an object' };
  const { action, args } = obj;
  const allowed = new Set(['add_note','list_notes','update_note','delete_note','no_op']);
  if(!allowed.has(action)) return { ok: false, error: 'invalid action' };
  if(typeof args !== 'object' || args === null) return { ok: false, error: 'args must be object' };

  switch(action){
    case 'add_note':
      if(typeof args.text !== 'string') return { ok:false, error: 'add_note.args.text must be string' };
      if(args.text.trim().length === 0) return { ok:false, error: 'text cannot be empty' };
      return { ok:true };
    case 'list_notes':
      if('filter' in args){
        const f = args.filter;
        if(typeof f !== 'string') return { ok:false, error: 'filter must be string' };
        // allow "all", "TODO", "DONE" or "recent:N"
        if(f !== 'all' && f !== 'TODO' && f !== 'DONE' && !f.startsWith('recent:')) return { ok:false, error: 'invalid filter' };
      }
      if('limit' in args){
        if(args.limit !== null && !Number.isInteger(args.limit)) return { ok:false, error: 'limit must be integer or null' };
      }
      return { ok:true };
    case 'update_note':
      if(typeof args.id !== 'string') return { ok:false, error: 'update_note.args.id must be string' };
      if(!('text' in args) && !('status' in args)) return { ok:false, error: 'update_note must provide text or status' };
      if('text' in args && args.text !== null && typeof args.text !== 'string') return { ok:false, error: 'text must be string or null' };
      if('status' in args && args.status !== null && !(args.status === 'TODO' || args.status === 'DONE')) return { ok:false, error: 'invalid status' };
      return { ok:true };
    case 'delete_note':
      if(typeof args.id !== 'string') return { ok:false, error: 'delete_note.args.id must be string' };
      return { ok:true };
    case 'no_op':
      if(typeof args.message !== 'string') return { ok:false, error: 'no_op.args.message must be string' };
      return { ok:true };
    default:
      return { ok:false, error: 'unknown action' };
  }
}

// ---------------------------
// Express app & endpoint
// ---------------------------
const app = express();
app.use(express.json());

app.post('/message', async (req, res) => {
  const userText = req.body && req.body.text;
  if(typeof userText !== 'string') return res.status(400).json({ error: 'text required' });

  // pass a small snapshot to the LLM (top 10 notes)
  const snapshot = await listNotes({ filter: 'all', limit: 10 });

  let llmResult;
  try {
    llmResult = await callLLM(SYSTEM_PROMPT, userText, { notes_snapshot: snapshot });
  }catch(e){
    return res.status(500).json({ error: 'llm_call_failed', detail: String(e) });
  }

  const valid = validateLLMResult(llmResult);
  if(!valid.ok) return res.status(400).json({ error: 'invalid_llm_output', detail: valid.error, raw: llmResult });

  const { action, args } = llmResult;

  try{
    if(action === 'add_note'){
      const note = await addNote(args.text);
      return res.json({ message: 'Note added', note });
    }
    if(action === 'list_notes'){
      const notes = await listNotes({ filter: args.filter || 'all', limit: args.limit ?? null });
      return res.json({ notes });
    }
    if(action === 'update_note'){
      const note = await updateNote(args.id, { text: ('text' in args) ? args.text : null, status: ('status' in args) ? args.status : null });
      return res.json({ message: 'Note updated', note });
    }
    if(action === 'delete_note'){
      await deleteNote(args.id);
      return res.json({ message: 'Note deleted', id: args.id });
    }
    if(action === 'no_op'){
      return res.json({ message: args.message });
    }
    return res.status(400).json({ error: 'unknown_action' });
  }catch(e){
    console.error('Execution error:', e);
    return res.status(400).json({ error: 'execution_error', detail: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Notes agent listening on http://localhost:${PORT}`);
});

// ---------------------------
// Notes, wiring tips & next steps
// ---------------------------
/*
- callLLM wiring examples:
  - OpenAI: use function-calling or ask the model to return JSON and parse/validate.
  - Local LLM: ensure the model returns clean JSON (prefer deterministic options: low temperature, structured output).

- Important safety:
  - ALWAYS validate the LLM output (we do with validateLLMResult).
  - Keep an audit log (append every LLM decision + args) for debugging—append to a file or a DB table.
  - Limit the notes snapshot size you send to the model to avoid leaking too much data.

- Persistence & scaling:
  - For prod, use SQLite/Postgres (single table with created_at index) instead of a JSON file.
  - If multiple Node instances will run, coordinate with a DB and/or distributed lock (Redis).

- UX improvements:
  - Support index-based references: when returning list_notes to user, include a numeric index and map index->id server-side so user can say "delete 2".
  - If user says "remove this" with no id, the LLM should return list_notes and your frontend should show choices.

- Extending the schema:
  - Add due_date, tags, pinned, position (for reordering).
  - Add a "reorder_note" action if you need drag&drop reordering.

- Example LLM response (exact JSON only):
  {"action":"add_note","args":{"text":"Buy milk"}}
  {"action":"list_notes","args":{"filter":"TODO","limit":10}}
  {"action":"update_note","args":{"id":"<uuid>","status":"DONE"}}
  {"action":"no_op","args":{"message":"Which note do you mean? Reply with the note id or say 'list' to see notes.'"}}
*/
