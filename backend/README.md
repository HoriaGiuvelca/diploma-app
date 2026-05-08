# Minimal SMTP Backend

This backend exposes a single endpoint used by your frontend:

- `POST /send-diploma-email`

Request JSON body:

```json
{
  "name": "Participant Name",
  "email": "person@example.com",
  "fileName": "Diploma - Participant Name.pdf",
  "pdfBase64": "<base64 pdf>"
}
```

## 1. Local setup

1. Install Node.js 18+.
2. In this folder, install dependencies:

```bash
npm install
```

3. Create your env file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Edit `.env` with your SMTP credentials.
5. Start server:

```bash
npm start
```

The API will run on `http://localhost:8080`.

## 2. Frontend connection

In your `index.html`, set:

```js
const EMAIL_API_URL = 'http://localhost:8080/send-diploma-email';
```

For production, replace this with your deployed backend URL.

## 3. Free deployment options

## Option A: Render (easy)

1. Push project to GitHub.
2. Create a new Web Service in Render.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add env vars from `.env.example` in Render dashboard.
7. Deploy and copy URL.
8. Update frontend `EMAIL_API_URL` to `https://<your-render-service>/send-diploma-email`.

## Option B: Railway (trial/free credits)

1. Create project from GitHub repo.
2. Set service root to `backend`.
3. Add env vars.
4. Deploy and copy URL.
5. Update frontend URL.

## Option C: Fly.io (free allowance can vary)

1. Install flyctl.
2. Run `fly launch` in `backend`.
3. Set secrets with `fly secrets set ...`.
4. Deploy with `fly deploy`.

## Notes

- Gmail SMTP requires an app password (2FA enabled).
- For better deliverability, use a dedicated SMTP provider like Brevo, Mailgun, Resend SMTP, or SendGrid SMTP.
- Restrict `CORS_ORIGIN` to your frontend domain in production.
