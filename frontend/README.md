# Smart Assistant Todos — Frontend

This is the frontend for the Smart Assistant Todos app, built with **React** and **Vite**.

## Features

- Sticky notes UI with fun colors and subtle random rotation
- Scrollable notes grid
- Fixed textarea at the bottom for sending messages to the assistant
- Add, list, and update notes via backend API
- Status badges for TODO/DONE
- Responsive design

## Getting Started

### Install dependencies

```sh
npm install
```

### Run the development server

```sh
npm run dev
```

## Usage

- The notes grid displays all notes returned from the backend.
- Use the textarea at the bottom to send commands or add notes (e.g., "add buy milk").
- Click **Refresh** to reload notes from the backend.

## API

The frontend communicates with the backend at `/message` via POST requests.

## Tech Stack

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) (for styling)
- [TypeScript](https://www.typescriptlang.org/) (recommended)

## Project Structure

- `src/App.tsx` — Main app UI
- `src/components/ui/` — UI components (Card, Button, Badge, etc.)
- `src/lib/utils.ts` — Utility functions

## Customization

- Change sticky note colors in `stickyStyle()` in `App.tsx`.
- Adjust grid layout via Tailwind
