# Notes Agent Backend

This is a Node.js backend for a notes assistant powered by an LLM.  
It provides a REST API for managing notes and interacts with an LLM to interpret user commands.

## Features

- Add, list, update, and delete notes
- Notes are stored in a local JSON file
- LLM interprets user messages and decides actions
- Thread-safe file access using a mutex

## Project Structure

```
backend/
├── index.js                # Express app entry point
├── routes/
│   └── message.js          # API route handler
├── services/
│   ├── notes.js            # Notes business logic
│   └── llm.js              # LLM interaction logic
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
2. Start the server:
   ```
   node index.js
   ```

## Customization

- The LLM model and prompt are configured in `services/llm.js`.
- Notes are stored in `storage/notes.json`.

## License

MIT