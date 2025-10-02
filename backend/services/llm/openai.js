const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function callOpenAI(systemPrompt, userMessage, context) {
  if(!process.env.OPENAI_API_KEY){
    throw new Error("OPENAI_API_KEY environment variable not set");
}
  const notesSnapshot = (context && context.notes_snapshot) ? JSON.stringify(context.notes_snapshot) : "[]";
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${userMessage}\n\nNotes snapshot:\n${notesSnapshot}` }
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo", // or "gpt-4" if you have access
    messages,
    temperature: 0,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content ?? "";
  try { return JSON.parse(content); } catch (e) {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch (_) {}
    return { action: "no_op", args: { message: "Could not parse LLM output." } };
  }
}

module.exports = { callOpenAI };