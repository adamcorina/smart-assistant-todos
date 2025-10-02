# Notes Agent Backend

This is a Node.js backend for a notes assistant powered by an LLM.  
It provides a REST API for managing notes and interacts with an LLM (either Ollama or OpenAI) to interpret user commands.

## Features

- Add, list, update, and delete notes
- Notes are stored in a local JSON file
- LLM (Ollama or OpenAI) interprets user messages and decides actions
- Thread-safe file access using a mutex

## Supported LLM Providers

- **Ollama** (local models, e.g., Gemma, Llama)
- **OpenAI** (remote models, e.g., GPT-3.5, GPT-4)

You can switch between providers by configuring the code in `services/llm/`.

## Project Structure

```
backend/
├── index.js                # Express app entry point
├── routes/
│   └── message.js          # API route handler
├── services/
│   ├── notes.js            # Notes business logic
│   └── llm/
│       ├── llm.js    # Shared LLM logic
│       ├── ollama.js       # Ollama integration
│       └── openai.js       # OpenAI integration
├── repositories/
│   └── notes.js            # Notes storage and mutex
├── storage/
│   └── notes.json          # Notes data file
```

## API

### POST `/message`

Send a user message to the assistant.  
**Request body:**
```json
{ "text": "your message here" }
```
**Response:**  
- Action result (e.g., added note, list of notes, etc.)

## Running Locally

1. Install dependencies:
   ```
   npm install
   ```
2. Set up environment variables:
   - For **OpenAI**, add your API key to a `.env` file:
     ```
     OPENAI_API_KEY=sk-...
     ```
   - For **Ollama**, ensure the Ollama server is running locally.

3. Start the server:
   ```
   node index.js
   ```

## Customization

- The LLM provider and prompt are configured in `services/llm/`.
- Notes are stored in `storage/notes.json`.

## License