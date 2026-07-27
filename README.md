# StudyHub

A Learning Management System (LMS) REST API built with Node.js, Express, and MySQL. Supports students, lecturers, and admins for course management, enrollments, resource uploads, and study progress tracking.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MySQL](https://www.mysql.com/) 8.x

## Quick start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: `5000`) |
| `DB_HOST` | MySQL host |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (`studyhub`) |
| `JWT_SECRET` | Secret key for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `7d`, `24h`) |

### 3. Create and seed the database

From the `backend` directory:

```bash
mysql -u root -p < schema.sql
mysql -u root -p studyhub < seed.sql
```

If you already have a StudyHub database, apply the feature migration instead of recreating it:

```bash
mysql -u root -p studyhub < migrations/001_features.sql
```

On Windows (PowerShell), you can instead run:

```powershell
Get-Content schema.sql | mysql -u root -p
Get-Content seed.sql | mysql -u root -p studyhub
```

### 4. Run the server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`. A health check responds at `GET /` with `StudyHub API Running`.

## Seed accounts

All seed users share the password **`password123`**:

| Role | Email |
|------|-------|
| Admin | `admin@studyhub.test` |
| Lecturer | `lecturer@studyhub.test` |
| Student | `student@studyhub.test` |

Public registration creates **student** accounts only. Admin and lecturer accounts must be seeded or created through an admin flow.

## API overview

Authentication uses JWT Bearer tokens: `Authorization: Bearer <token>`.

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, profile update, admin lecturer creation |
| `/api/courses` | Course CRUD, lecturer list, admin lecturer reassignment |
| `/api/enrollments` | Student enrollment and unenrollment |
| `/api/resources` | Course file uploads (PDF, MP4, PNG, JPEG), secure download |
| `/api/progress` | Learning logs, journal, progress, course progress export |
| `/api/announcements` | Course announcements for enrolled students |
| `/api/reports` | Admin user directory and CSV/PDF exports |
| `/api/dashboard` | Admin and lecturer dashboard summaries |

Uploaded files are stored in `backend/uploads/resources/` and accessed via:
- `GET /api/resources/:resourceId/view` — inline viewing (PDF, images, video)
- `GET /api/resources/:resourceId/download` — file download

Both require authentication and course access. Direct `/uploads` URLs are not served publicly.

### Notable endpoints

- `PUT /api/auth/profile` — update name, email, and/or password
- `DELETE /api/enrollments/enroll/:courseId` — student unenrollment
- `DELETE /api/progress/log/:logId` — delete a journal entry
- `GET /api/progress/course/:courseId/export?format=csv|pdf` — lecturer/admin course progress export
- `GET /api/reports/users?category=lecturers|admins|not_enrolled|students_by_course&courseId=` — admin user directory by category
- `GET /api/reports/students?status=all|enrolled|unenrolled&courseId=` — student analytics report
- `GET /api/reports/lecturers` — lecturer analytics report
- `GET /api/reports/students/:id` — student detail for admin reports
- `GET /api/reports/*/export?format=csv|pdf` — scoped CSV/PDF exports

Courses support a configurable `completion_target_minutes` field (default `1000`). Student completion percentage is calculated from logged study minutes against that target.

## Project structure

```
backend/
├── config/         # Database connection
├── controllers/    # Request handlers
├── middleware/     # Auth and role checks
├── models/         # SQL queries
├── routes/         # Route definitions
├── validations/    # Input validation
├── utils/          # JWT, multer config
├── schema.sql      # Database schema
├── seed.sql        # Sample data
└── server.js       # Entry point
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run the server |
| `npm run dev` | Run with nodemon (auto-reload) |
| `npm test` | Run integration tests (requires MySQL with schema + seed) |

Integration tests use the database configured in `.env`. Apply `schema.sql` and `seed.sql` before running tests.

## Frontend (React)

The web app lives in `frontend/` and uses **React + Vite + plain CSS**.

### Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` requests to the backend on port `5000`.

Start the backend first:

```bash
cd backend
npm run dev
```

### Frontend scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## License

ISC
