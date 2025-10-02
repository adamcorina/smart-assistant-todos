# Smart Assistant Todos

A full-stack sticky notes app powered by a smart assistant backend.

## Overview

- **Frontend:** React + Vite + Tailwind CSS  
  Interactive sticky notes UI, scrollable grid, fixed message input.
- **Backend:** Node.js + Express  
  Handles note management and assistant commands via a simple API.

## Features

- Add, list, and update notes using natural language commands
- Fun sticky note colors and random rotation
- Status badges for TODO/DONE
- Responsive design
- Scrollable notes grid
- Fixed textarea for sending messages to the assistant

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Setup

#### 1. Clone the repository

```sh
git clone https://github.com/your-username/smart-assistant-todos.git
cd smart-assistant-todos
```

#### 2. Install dependencies

```sh
cd backend
npm install

cd ../frontend
npm install
```

#### 3. Start the backend

```sh
cd backend
npm start
```

#### 4. Start the frontend

```sh
cd frontend
npm run dev
```

## API

- **POST** `/message`  
  Accepts `{ text: string }` and returns notes based on the command.

## Project Structure

```
smart-assistant-todos/
  backend/      # Express server
  frontend/     # React app
```

## Customization

- Change sticky note colors in `frontend/src/App.tsx` (`stickyStyle` function).
- Adjust grid layout and styles via Tailwind classes.