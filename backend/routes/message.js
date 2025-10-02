const { callLLM, validateLLMResult } = require('../services/llm/llm');
const { addNote, listNotes, updateNote, deleteNote } = require('../services/notes');

async function handleMessage(req, res) {
  const userText = req.body && req.body.text;
  if (typeof userText !== 'string') return res.status(400).json({ error: 'text required' });

  const snapshot = await listNotes({ filter: 'all', limit: 10 });

  let llmResult;
  try {
    llmResult = await callLLM(userText, { notes_snapshot: snapshot });
  } catch (e) {
    return res.status(500).json({ error: 'llm_call_failed', detail: String(e) });
  }

  const valid = validateLLMResult(llmResult);
  if (!valid.ok) return res.status(400).json({ error: 'invalid_llm_output', detail: valid.error, raw: llmResult });

  const { action, args } = llmResult;

  try {
    if (action === 'add_note') {
      const note = await addNote(args.text);
      return res.json({ message: 'Note added', note });
    }
    if (action === 'list_notes') {
      const notes = await listNotes({ filter: args.filter || 'all', limit: args.limit ?? null });
      return res.json({ notes });
    }
    if (action === 'update_note') {
      const note = await updateNote(args.id, { text: ('text' in args) ? args.text : null, status: ('status' in args) ? args.status : null });
      return res.json({ message: 'Note updated', note });
    }
    if (action === 'delete_note') {
      await deleteNote(args.id);
      return res.json({ message: 'Note deleted', id: args.id });
    }
    if (action === 'no_op') {
      return res.json({ message: args.message });
    }
    return res.status(400).json({ error: 'unknown_action' });
  } catch (e) {
    console.error('Execution error:', e);
    return res.status(400).json({ error: 'execution_error', detail: String(e) });
  }
}

module.exports = { handleMessage };