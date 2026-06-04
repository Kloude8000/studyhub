# StudyHub Frontend

React single-page app for the StudyHub LMS API.

## Stack

- React (JavaScript)
- Vite
- React Router
- TanStack Query
- Axios
- Plain CSS (global + CSS Modules)

## Development

1. Start the backend on port 5000
2. From this folder:

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Demo accounts

Use the seed accounts from the root README (`password123`).

## Role areas

- `/student` — browse, enroll, resources, journal, progress
- `/lecturer` — course CRUD, uploads, roster, class progress
- `/admin` — all courses, create lecturers
