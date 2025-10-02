// const { callOllama } = require('./ollama');
const { callOpenAI } = require('./openai');

const MAX_TEXT_LENGTH = 4000;
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

async function callLLM(userMessage, context) {
  // const result = callOllama(SYSTEM_PROMPT, userMessage, context);
  const result = callOpenAI(SYSTEM_PROMPT, userMessage, context);
  return result;
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