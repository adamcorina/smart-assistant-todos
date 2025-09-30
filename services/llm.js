const { Ollama } = require('ollama');
const client = new Ollama({ host: 'http://127.0.0.1:11434' });

const SYSTEM_PROMPT = `You are a Notes Assistant. ...`; // Use your existing prompt here

async function callLLM(systemPrompt, userMessage, context) {
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

  const content = res?.message?.content ?? "";
  try { return JSON.parse(content); } catch (e) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch (_) {}
    return { action: "no_op", args: { message: "Could not parse LLM output." } };
  }
}

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

module.exports = { SYSTEM_PROMPT, callLLM, validateLLMResult };