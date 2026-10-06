# Portfolio + Custom CMS

One project, two folders:

- `backend/`  Node.js + Express + MongoDB. Custom CMS API (JWT auth, CRUD, uploads, contact email, stats).
- `frontend/` Portfolio site (`/`) and admin panel (`/admin/`). Plain HTML/CSS/JS, no build step. Every piece of content comes from the API.

## Run it (3 minutes)
```
cd backend
npm install
cp .env.example .env     # set MONGO_URI (local MongoDB or Atlas) and the two JWT secrets
npm run seed             # creates the admin user + sample content
npm run dev
```
- Site:  http://localhost:5000
- Admin: http://localhost:5000/admin/   (login = ADMIN_EMAIL / ADMIN_PASSWORD from .env)

The Express server also serves the `frontend/` folder, so one command runs everything.
To host the frontend separately (Vercel/Netlify), set `window.API_URL` in `frontend/js/config.js` to the backend URL and add the frontend URL to `CLIENT_ORIGINS`.

## Features
Portfolio: typing role animation, dark/light theme, scroll progress bar, animated counters, skill bars, project filter by tag + live search, featured badge, cover images, testimonial slider, blog reader with read time and likes, Ctrl/Cmd+K command palette, visitor counter, contact form, skeleton loaders, mobile friendly.
Admin: JWT login with automatic token refresh, dashboard (stats + 7-day messages chart), CRUD for projects/skills/blogs/experience/testimonials/services, About editor, image upload with preview, draft posts, search, unread message badge, mark read / reply / delete.

## API
| Method | Route | Auth |
|---|---|---|
| POST | /auth/login, /auth/refresh | no |
| GET, PUT | /about | PUT needs token |
| GET, POST, PUT, DELETE | /skills /projects /blogs /experience /testimonials /services (+ /:id) | writes need token |
| GET | list routes accept `?q=` search, `?tag=` (projects), `?limit=&page=` (total in `X-Total-Count`) | no |
| POST | /blogs/:id/like | no (5 per hour) |
| GET, POST | /stats, /stats/visit | no |
| GET | /stats/admin | token |
| POST | /upload/image (form field `image`, max 5 MB) | token |
| GET | /media | token |
| POST | /contact | no (5 per hour per IP) |
| GET, PATCH, DELETE | /messages, /messages/:id/read, /messages/:id | token |

Header: `Authorization: Bearer <accessToken>`. Access tokens last 15 minutes; the admin panel refreshes them automatically.
Draft blog posts (`published: false`) are visible only to a logged-in admin.

## Deploy
Backend + site on Render or Railway as one service: set the .env values as environment variables, use MongoDB Atlas for MONGO_URI, set PUBLIC_URL to your service URL. Run `npm run seed` once.
Uploaded images are stored on disk, which Render/Railway wipe on redeploy. For production, move uploads to Cloudinary or S3.
