# IntelliTask

An AI-powered productivity web application that combines Task Management, Note-Taking, PDF Summarization, and a context-aware AI Chatbot — all running locally with [Ollama](https://ollama.com) and TinyLlama.

---

## Features

### Task Management (Kanban Board)
- Drag-free Kanban board with **To Do**, **In Progress**, and **Done** columns
- Quick status transitions between columns with a single click
- Priority levels (**Low / Medium / High**) with color-coded badges
- Due date tracking with automatic overdue / due-soon alerts
- Smart sorting by priority weight + due date proximity

### Notes & PDF Summarization
- Rich note editor with auto-save (debounced 1-second save)
- Upload PDFs directly — text is extracted and stored as a note automatically
- AI-powered summarization using a chunked RAG pipeline that splits large PDFs into 500-word chunks, summarizes each individually, then merges them into a final coherent summary
- Works within TinyLlama's strict 2,048-token context window

### AI Chatbot (RAG-Based)
- Full-screen ChatGPT-style interface with real-time **Server-Sent Events (SSE)** streaming
- Answers are streamed word-by-word, not loaded all at once
- Retrieval-Augmented Generation (RAG): uses keyword extraction + regex scoring against MongoDB to find the top 3 most relevant tasks/notes before generating a response
- Strictly scoped to your workspace data — refuses to answer general knowledge questions
- Displays "Sources Referenced" badges showing which tasks/notes were used

### Dashboard
- Overview stats: Total Tasks, To Do, In Progress, Completed, Notes count
- Completion rate progress bar
- Overdue task alerts
- Quick action links to Tasks, Notes, and AI Chat
- Recent tasks and notes preview

### Reminders
- Automatic due-date reminders displayed as a bottom banner on app load
- Alerts for overdue tasks, tasks due today, and tasks due within 2 days
- Dismissible — only shown once per session (on refresh/open), not recurring

---

## Tech Stack

| Layer       | Technology                                                         |
|-------------|---------------------------------------------------------------------|
| **Frontend** | React 19, Vite 8, TailwindCSS 4, React Router 7                  |
| **Backend**  | Node.js, Express 5, Mongoose 9                                    |
| **Database** | MongoDB (Atlas or local)                                           |
| **AI/LLM**   | [Ollama](https://ollama.com) with TinyLlama (local, no API keys) |
| **PDF**      | pdf-parse v1.1.1                                                   |
| **Auth**     | JWT (jsonwebtoken) + bcryptjs                                      |

---

## Project Structure

```
IntelliTask/
├── backend/
│   ├── controllers/       # Route handlers (auth, tasks, notes, chat)
│   ├── middleware/         # JWT authentication middleware
│   ├── models/             # Mongoose schemas (User, Task, Note)
│   ├── routes/             # Express route definitions
│   ├── services/           # AI service (Ollama) & RAG service
│   ├── server.js           # Express server entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Sidebar, NotificationBanner
│   │   ├── context/        # AuthContext, NotificationContext
│   │   ├── pages/          # Dashboard, Tasks, Notes, Chat, Login, Register
│   │   ├── App.jsx         # Root component with routing
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
└── package.json            # Root workspace (concurrently runs both)
```

---

## Prerequisites

1. **Node.js** (v18 or higher) — [Download](https://nodejs.org)
2. **MongoDB** — Either [MongoDB Atlas](https://www.mongodb.com/atlas) (cloud) or a local MongoDB instance
3. **Ollama** — [Download](https://ollama.com/download) and install, then pull the TinyLlama model:
   ```bash
   ollama pull tinyllama
   ```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/B-G-A/IntelliTask.git
cd IntelliTask
```

### 2. Install Dependencies

```bash
npm run install:all
```

This installs dependencies for both the backend and frontend.

### 3. Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
OLLAMA_URL=http://127.0.0.1:11434/api/generate
```

### 4. Start Ollama

Make sure Ollama is running in the background:

```bash
ollama serve
```

### 5. Run the Application

From the root directory:

```bash
npm run dev
```

This starts both the backend (port 5000) and frontend (port 5173) simultaneously.

Open your browser and navigate to **http://localhost:5173**.

---

## API Endpoints

| Method | Route                     | Description                  | Auth |
|--------|---------------------------|------------------------------|------|
| POST   | `/api/auth/register`       | Register a new user          | No   |
| POST   | `/api/auth/login`          | Login and receive JWT token  | No   |
| GET    | `/api/auth/me`             | Get current user profile     | Yes  |
| GET    | `/api/tasks`               | Get all tasks for user       | Yes  |
| POST   | `/api/tasks`               | Create a new task            | Yes  |
| PUT    | `/api/tasks/:id`           | Update a task                | Yes  |
| DELETE | `/api/tasks/:id`           | Delete a task                | Yes  |
| GET    | `/api/notes`               | Get all notes for user       | Yes  |
| POST   | `/api/notes`               | Create a new note            | Yes  |
| PUT    | `/api/notes/:id`           | Update a note                | Yes  |
| DELETE | `/api/notes/:id`           | Delete a note                | Yes  |
| POST   | `/api/notes/upload-pdf`    | Upload PDF → extract + summarize | Yes |
| POST   | `/api/notes/:id/summarize` | AI-summarize an existing note | Yes |
| POST   | `/api/chat`                | RAG-based AI chat (SSE stream) | Yes |

---

## Architecture Highlights

### RAG Pipeline (Retrieval-Augmented Generation)
The AI chatbot does **not** send all user data to the LLM. Instead:
1. User's question is parsed for keywords (stop-words removed)
2. Keywords are matched via regex against all task titles, descriptions, note titles, and content in MongoDB
3. Each item is scored by keyword match count (with boosts for high-priority and overdue tasks)
4. Only the **top 3 most relevant items** are injected into the prompt
5. TinyLlama generates a response based solely on that focused context

### PDF Chunked Summarization
Large PDFs are handled safely within TinyLlama's 2,048-token limit:
1. Extracted text is split into **500-word chunks**
2. Each chunk is summarized individually via a separate Ollama call
3. All partial summaries are combined into a **final master summary** in one last call

### SSE Streaming
The chat endpoint uses **Server-Sent Events** to stream AI responses token-by-token to the frontend, providing a real-time typing experience similar to ChatGPT.

---

## License

This project is open source and available under the [MIT License](LICENSE).
