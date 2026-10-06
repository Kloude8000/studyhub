# StudyHub

StudyHub is a full-stack Learning Management System (LMS) for students, lecturers, and administrators. It includes a Node.js/Express/MySQL REST API and a vanilla HTML/CSS/JavaScript web frontend with role-specific dashboards.

## Features

### Students
- Register and log in with email or student ID
- Browse and enroll in courses
- View course details and download/view course resources (PDF, MP4, PNG, JPEG)
- Track study progress by logging one journal entry per course topic
- See Viewed/Downloaded status on resources; last activity is recorded automatically
- Receive in-app notifications and read course and platform announcements
- Update profile and change password

### Lecturers
- Create and manage courses and course topics
- Upload course resources
- Post course announcements
- Enrol existing students from a course Students tab
- View enrolled students, topic checklists, and course progress
- Dashboard stats (total students, average progress)

### Admins
- Platform overview (user, course, and enrollment counts)
- User management with lazy-loaded categories: lecturers, students by course, unenrolled students, administrators
- Create lecturers and delete users
- Manage all courses on the platform
- Post platform-wide announcements
- Export reports (CSV/PDF)

## Tech stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express 5, MySQL 2 |
| Auth | JWT (Bearer tokens), bcrypt |
| Validation | express-validator |
| File uploads | Multer |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Tests | Jest, Supertest |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MySQL](https://www.mysql.com/) 8.x
- A static file server for the frontend (e.g. [serve](https://www.npmjs.com/package/serve)) — optional but recommended

## Quick start

### 1. Clone and install backend dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (`studyhub`) |
| `JWT_SECRET` | Secret for signing JWTs — use a long random string |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`, `24h`) |

### 3. Create and seed the database

From the project root:

**Linux / macOS**

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p studyhub < database/seed.sql
```

**Windows (PowerShell)**

```powershell
Get-Content database\schema.sql | mysql -u root -p
Get-Content database\seed.sql | mysql -u root -p studyhub
```

### 4. Start the API

```bash
cd backend
npm run dev
```

The API runs at `http://localhost:5000`. Health check: `GET /` returns `StudyHub API Running`.

### 5. Serve the frontend

The frontend is static HTML — it does not use a bundler. Serve the `frontend/` folder over HTTP (avoid opening pages via `file://`).

**Option A — npx (no install)**

```bash
npx serve frontend
```

**Option B — VS Code / Live Server**

Open any page under `frontend/` through a local HTTP server on a port such as `3000` or `5173`.

### 6. Configure the frontend API URL

If your backend is not on `http://localhost:5000`, update `frontend/js/config.js`:

```javascript
StudyHub.API_BASE = 'http://your-host:5000';
```

Then open `http://localhost:3000/login.html` (or whatever port your static server uses).

## Seed accounts

All seed users use the password **`password123`**:

| Role | Email | Student ID |
|------|-------|------------|
| Admin | `admin@studyhub.test` | — |
| Lecturer | `lecturer@studyhub.test` | — |
| Student | `student@studyhub.test` | `S12345` |

Students can log in with **email or student ID**. Public registration creates student accounts only. Lecturers are created by an admin; the admin account comes from seed data.

## Frontend pages

| Page | Role |
|------|------|
| `login.html` | All |
| `register.html` | Student registration |
| `dashboard.html` | Student |
| `lecturer-dashboard.html` | Lecturer |
| `admin-dashboard.html` | Admin |

Shared scripts loaded by the dashboards:

- `js/config.js` — API base URL and dashboard routes
- `js/utils.js` — HTML escaping, session helpers, role guards
- `js/api.js` — authenticated fetch and resource view/download helpers

## API overview

All protected routes require:

```
Authorization: Bearer <token>
```

### Auth — `/api/auth`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/register` | Public | Register a student |
| POST | `/login` | Public | Log in with email or student ID |
| GET | `/profile` | Authenticated | Get current user |
| PUT | `/profile` | Authenticated | Update profile / password |
| GET | `/admin/stats` | Admin | Platform statistics |
| GET | `/users` | Admin | List all users |
| GET | `/users/lecturers` | Admin | Lecturers with courses taught |
| GET | `/users/unenrolled-students` | Admin | Students with no enrollments |
| GET | `/users/admins` | Admin | Administrator accounts |
| GET | `/users/course-options` | Admin | Courses with enrollment counts |
| POST | `/users/lecturer` | Admin | Create a lecturer |
| DELETE | `/users/:userId` | Admin | Delete a user |

### Courses — `/api/courses`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Public | List all courses |
| GET | `/:id` | Public | Get course by ID |
| POST | `/create` | Lecturer, Admin | Create a course |
| GET | `/my-courses` | Lecturer, Admin | Courses owned by current user |
| PUT | `/:id` | Lecturer, Admin | Update a course |
| DELETE | `/:id` | Lecturer, Admin | Delete a course |

### Enrollments — `/api/enrollments`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/enroll/:courseId` | Student | Enroll in a course |
| DELETE | `/unenroll/:courseId` | Student | Unenroll from a course |
| GET | `/my-enrollments` | Student | List own enrollments |
| GET | `/course/:courseId` | Lecturer, Admin | Students enrolled in a course |
| GET | `/course/:courseId/available-students` | Lecturer, Admin | Students not yet enrolled |
| POST | `/course/:courseId/students` | Lecturer, Admin | Enrol an existing student |
| DELETE | `/course/:courseId/students/:studentId` | Lecturer, Admin | Remove a student (clears journal and progress) |

### Resources — `/api/resources`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/upload/:courseId` | Lecturer, Admin | Upload a file (`file` field) |
| GET | `/course/:courseId` | Authenticated | List course resources (access checked) |
| GET | `/:resourceId/view` | Authenticated | View file inline |
| GET | `/:resourceId/download` | Authenticated | Download file |
| DELETE | `/:resourceId` | Lecturer, Admin | Delete a resource |

Allowed upload types: PDF, MP4, PNG, JPEG, up to 200 MB. Files are stored in `backend/uploads/resources/` and are **not** exposed as public static URLs.

### Progress — `/api/progress`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| POST | `/log` | Student | Add a learning log |
| PUT | `/log/:logId` | Student | Update a learning log |
| DELETE | `/log/:logId` | Student | Delete a learning log |
| GET | `/my-progress` | Student | Own progress summary |
| GET | `/logs` | Student | All journal entries |
| GET | `/logs/course/:courseId` | Student | Journal entries for a course |
| GET | `/course/:courseId` | Lecturer, Admin | Progress for all students in a course |

### Notifications — `/api/notifications`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/` | Authenticated | Inbox for the current user |
| GET | `/unread-count` | Authenticated | Unread badge count |
| PUT | `/read-all` | Authenticated | Mark all as read |
| PUT | `/:id/read` | Authenticated | Mark one as read |

### Announcements — `/api/announcements`

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/platform` | Authenticated | List platform announcements |
| POST | `/platform` | Admin | Post a platform announcement |
| GET | `/course/:courseId` | Authenticated | List course announcements (access checked) |
| POST | `/course/:courseId` | Lecturer, Admin | Post a course announcement |
| PUT | `/:id` | Author or Admin | Edit an announcement (does not re-notify) |
| DELETE | `/:id` | Author or Admin | Delete an announcement |

Notifications are created in-app when a student enrols, a resource is uploaded, a course is completed, a lecturer account is created, or an announcement is posted. Email and live chat are not included.

## Project structure

```
studyhub/
├── backend/
│   ├── config/           # Database connection
│   ├── controllers/      # Request handlers
│   ├── middleware/       # JWT auth and role checks
│   ├── models/           # SQL queries
│   ├── routes/           # Route definitions
│   ├── validations/      # Input validation
│   ├── utils/            # JWT, multer, access helpers
│   ├── tests/            # Integration tests
│   ├── uploads/resources/# Uploaded course files (gitignored)
│   ├── app.js            # Express app
│   └── server.js         # Entry point
├── database/
│   ├── schema.sql                 # Database schema
│   ├── seed.sql                   # Sample data
│   ├── migrate_progress.sql       # Existing-DB progress upgrade
│   └── migrate_notifications.sql  # Existing-DB notifications upgrade
└── frontend/
    ├── css/              # Stylesheets
    ├── js/               # Page scripts and shared StudyHub utilities
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── lecturer-dashboard.html
    └── admin-dashboard.html
```

## Scripts

Run from the `backend/` directory:

| Command | Description |
|---------|-------------|
| `npm start` | Start the API |
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm test` | Run integration tests |

If you already have a StudyHub database, do **not** re-run the full `schema.sql`. Apply `database/migrate_progress.sql` and `database/migrate_notifications.sql` in MySQL Workbench against your existing schema (for example `studyhub` or `studyhub_db`). Restart the API after migrating.

## Deployment notes

For a staging or deployment test:

1. Set a strong `JWT_SECRET` in production `.env`.
2. Apply `database/schema.sql` and `database/seed.sql` (or your own migration/seed).
3. Ensure `backend/uploads/resources/` exists and is writable.
4. Update `StudyHub.API_BASE` in `frontend/js/config.js` to match your API host.
5. Serve `frontend/` as static files (nginx, `serve`, etc.) and run the API separately.
6. Restrict CORS in `backend/app.js` if the frontend and API are on different origins in production.

## License

ISC
