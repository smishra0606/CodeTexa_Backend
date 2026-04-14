# CodeTexa

CodeTexa is a full-stack ed-tech platform with role-based learning workflows for students, mentors, admins, and superadmins.

It includes:

- A React + Vite frontend for course discovery, onboarding, dashboards, player experience, and admin tools
- A Node.js + Express + MongoDB backend for auth, course management, progress tracking, quizzes, certificates, announcements, sessions, audit logs, and payments
- Optional Supabase Edge Function integration for a streaming AI assistant

## 1) Project Highlights

- Role-based authentication and authorization (`student`, `mentor`, `admin`, `superadmin`)
- Course lifecycle management (create, edit, delete, enroll)
- Student progress tracking and lesson completion
- Quiz + certificate flow
- Mentor session scheduling
- Announcements by course/role
- Admin and superadmin dashboards with audit trails
- Razorpay checkout + signature verification
- Cloudinary media uploads and signed video URL refresh
- Optional AI assistant via Supabase Edge Function

## 2) Tech Stack

### Frontend

- React 18 + TypeScript
- Vite 5
- React Router 6
- TanStack Query
- Tailwind CSS + shadcn/ui (Radix primitives)
- Framer Motion
- Axios
- Vitest + Testing Library

### Backend

- Node.js + Express 5
- MongoDB + Mongoose
- JWT auth (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- File upload (`multer`, `multer-storage-cloudinary`)
- Payment gateway (`razorpay`)
- Email (`nodemailer`)
- Security headers (`helmet`)

### Optional Platform Services

- Supabase Edge Functions (AI assistant)
- Cloudinary (images/video URL handling)

## 3) Monorepo Structure

```text
codetexa/
|- src/                     # Frontend app source (React + TS)
|  |- components/
|  |- hooks/
|  |- integrations/
|  |- lib/
|  |- pages/
|  `- test/
|- public/                  # Static assets + SPA redirects
|- backend/                 # Express API + MongoDB models
|  |- config/
|  |- controllers/
|  |- middleware/
|  |- models/
|  |- routes/
|  |- utils/
|  `- *.md                  # Operational guides and troubleshooting
|- supabase/                # Optional Supabase local config/functions
`- README.md
```

## 4) Prerequisites

- Node.js 18+
- npm 9+
- MongoDB instance (local or hosted)
- Cloudinary account (if uploading media)
- Razorpay account (if enabling payments)
- Supabase project (if enabling AI assistant)

## 5) Environment Variables

Create env files from templates:

- Root frontend: `.env` from `.env.example`
- Backend: `backend/.env` from `backend/.env.example`

### Frontend (`.env`)

```env
VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_API_URL="http://localhost:5000/api"
VITE_CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
VITE_CLOUDINARY_UPLOAD_PRESET="your_upload_preset"
VITE_RAZORPAY_KEY_ID="your_razorpay_key_id"
```

### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
NODE_ENV=development

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
FRONTEND_URL=http://localhost:5173

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Supabase Function Secret (Optional)

For `supabase/functions/ai-assistant/index.ts`, configure:

- `LOVABLE_API_KEY` in Supabase Edge Function secrets

## 6) Local Development Setup

Install dependencies in both apps:

```bash
# Frontend deps
npm install

# Backend deps
cd backend
npm install
```

Run in separate terminals:

```bash
# Terminal 1 (frontend)
npm run dev
```

```bash
# Terminal 2 (backend)
cd backend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- API base: `http://localhost:5000/api`

## 7) NPM Scripts

### Root (frontend)

- `npm run dev` - start Vite dev server
- `npm run build` - production build
- `npm run build:dev` - development-mode build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode

### Backend

- `npm run dev` - start backend with nodemon

## 8) Frontend Routing Map

### Public Routes

- `/`
- `/about`
- `/courses`
- `/courses/:id`
- `/training`
- `/contact`
- `/auth`, `/login`, `/signup`
- `/privacy`
- `/terms`
- `/refund`

### Protected Routes

- `/dashboard` (authenticated)
- `/profile` (authenticated)
- `/learn/:courseId` (`student`)
- `/player/:courseId` (`student`)
- `/mentor/create-course` (`mentor` or `admin`)
- `/mentor/add-course` (`mentor` or `admin`)
- `/admin` (`admin`)
- `/admin/courses/:id/edit` (`admin` or `superadmin`)
- `/superadmin` (`superadmin`)
- `/admin/users` (`superadmin`)
- `/admin/audit-logs` (`superadmin`)

Fallback route: `*` -> Not Found page.

## 9) Backend API Surface (By Base Route)

Backend mount points are configured in `backend/server.js`.

### `/api/auth` and `/api/users`

- `POST /register`, `POST /login` (public)
- `GET /profile`, `PUT /profile`, `PUT /change-password`, `POST /update-streak` (protected)
- `GET /my-courses` (protected)
- `GET /mentors` (admin)

### `/api/courses`

- Public: `GET /`, `GET /latest`, `GET /:id` (optional auth)
- Student/protected: lesson completion + completion status + enrolled courses + refresh signed video URL
- Mentor/admin: mentor course/student views
- Admin/superadmin: system stats and audit log views
- Admin: `POST /`, `PUT /:id`, `DELETE /:id` with audit middleware

### `/api/mentor`

- Mentor dashboard endpoint (protected mentor role)

### `/api/superadmin`

- Overview and revenue stats (superadmin)

### `/api/admin`

- Company/system stats
- User CRUD + role/status updates

### `/api/admin/reviews/image`

- `GET /active` public
- Remaining routes protected/admin (includes image upload)

### `/api/sessions`

- Session CRUD for mentor/admin
- Public session listing by course
- Protected upcoming sessions

### `/api/progress`

- All routes protected: read/update progress, module toggles, lesson completion, status checks

### `/api/activities`

- All routes protected: recent activities, by-type, stats

### `/api/announcements`

- Public course announcements
- Protected create/list/delete with role constraints for mentor/admin/superadmin flows

### `/api/quiz`

- Protected quiz question retrieval + submit

### `/api/certificate`

- Protected certificate generation and listing

### `/api/payment`

- `GET /diagnose` public (debug endpoint)
- `POST /checkout` protected
- `POST /verify` protected

## 10) Auth and Role Model

Authentication uses JWT bearer tokens.

Key middleware in `backend/middleware/authMiddleware.js`:

- `protect` - verifies token and attaches user
- `optionalProtect` - attempts auth without failing if token missing/invalid
- `authorize(...roles)` - generic role gate
- `isStudent`, `isMentor`, `isAdmin`, `isSuperAdmin` - role-specific gates

Client token handling is implemented in `src/lib/api.ts` with Axios interceptors.

## 11) Data Models (MongoDB/Mongoose)

- `User`: identity, role, auth fields, enrolled courses, streaks, certificates
- `Course`: metadata, category, instructor, modules, quiz, enrollment counters
- `Progress`: per user-course completion and progress percentage
- `Quiz`: standalone quiz structures linked to course
- `Session`: mentor/admin live session scheduling and status
- `Activity`: system/user activity feed records
- `Announcement`: course-linked announcements with role targeting
- `Enrollment`: payment/enrollment record between student and course
- `AuditLog`: admin action traceability
- `ImageReview`: testimonial/review image content for display

## 12) Testing

Frontend testing is configured with Vitest + JSDOM.

- Config: `vitest.config.ts`
- Setup file: `src/test/setup.ts`
- Example test: `src/test/example.test.ts`

Run tests:

```bash
npm run test
```

## 13) Deployment and Hosting Notes

- Frontend is SPA-ready; `public/_redirects` rewrites all routes to `index.html`
- Set production `VITE_API_URL` to your deployed backend API base
- Configure CORS and security headers according to your production domains
- Keep all secret keys server-side (`RAZORPAY_KEY_SECRET`, Cloudinary API secret, JWT secret)

## 14) Operations and Troubleshooting Docs

The backend folder contains targeted runbooks:

- `backend/EMAIL_SETUP.md` - welcome email setup (Gmail/app passwords)
- `backend/PAYMENT_SETUP.md` - Razorpay integration guide
- `backend/RAZORPAY_SETUP_TROUBLESHOOTING.md` - payment setup troubleshooting
- `backend/DEBUG_500_ERROR.md` - payment 500 debugging flow
- `backend/SERVER_RESTART_REQUIRED.md` - env-change restart reminders

## 15) Common Issues

- 401 responses: confirm JWT exists and is sent as `Authorization: Bearer <token>`
- Payment checkout errors: validate Razorpay keys in `backend/.env` and call `/api/payment/diagnose`
- Media upload issues: verify Cloudinary env vars on backend and frontend
- Empty dashboards: ensure MongoDB is connected and seeded with relevant users/courses
- AI assistant errors: verify `VITE_SUPABASE_URL`, publishable key, and Supabase secret `LOVABLE_API_KEY`

## 16) Security Checklist

- Never commit `.env` files
- Use strong `JWT_SECRET`
- Restrict CORS to known origins in production
- Disable or protect debug endpoints for production deployments
- Rotate payment/cloud credentials periodically

## 17) License

No explicit license file is present in this repository. Add a `LICENSE` file if distribution terms are required.
