const { Ollama } = require('ollama');
const client = new Ollama({ host: 'http://127.0.0.1:11434' });

async function callOllama(systemPrompt, userMessage, context) {
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

module.exports = { callOllama };