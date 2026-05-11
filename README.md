# Diploma Generator - Rotary Club Pitești Unity

An anonymous feedback-gated diploma generation and distribution system. Users complete a feedback form before generating and downloading their diploma as a PDF or receiving it via email.

## Features

- **Anonymous Feedback Collection**: Configurable feedback form with single-selection questions
- **JWT Token Gating**: Prevents diploma access until feedback is submitted
- **Server-Side PDF Generation**: Secure, token-authenticated diploma PDF creation
- **Email Distribution**: Send diplomas directly to user emails via Gmail API
- **Dynamic Question Configuration**: Questions and answers managed in Google Sheets
- **Real-Time Preview**: Canvas-based diploma preview with automatic text sizing
- **Responsive Design**: Works on desktop and mobile browsers
- **Zero Dependencies Frontend**: Uses vanilla JavaScript (ES6 modules) + Canvas API + jsPDF

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google Sheets with service account credentials
- (Optional) Gmail API credentials for email feature

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd diploma-app
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in required credentials (see Configuration section)

4. **Start the backend**
   ```bash
   npm start
   ```
   Backend will run on `http://localhost:8080`

5. **Open in browser**
   - Visit `http://localhost:8080`
   - Complete feedback form → Download or email diploma

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory with these variables:

#### Core Settings
```env
PORT=8080
CORS_ORIGIN=*
ENABLE_EMAIL_FEATURE=true
ENABLE_FEEDBACK_GATE=true
```

#### Google Sheets (Required)
```env
FEEDBACK_SHEET_ID=<your-sheet-id>
FEEDBACK_SHEET_NAME=Feedback
CONFIG_SHEET_NAME=Config
FEEDBACK_GOOGLE_CLIENT_EMAIL=<service-account-email>
FEEDBACK_GOOGLE_PRIVATE_KEY=<service-account-private-key>
```

#### Gmail API (Optional - for email feature)
```env
GMAIL_CLIENT_ID=<your-client-id>
GMAIL_CLIENT_SECRET=<your-client-secret>
GMAIL_REFRESH_TOKEN=<your-refresh-token>
GMAIL_SENDER_EMAIL=<your-email@gmail.com>
```

#### Diploma Image
```env
DIPLOMA_IMAGE_FILE=diploma_final.jpg
```

### Google Sheets Setup

#### Config Sheet
Structure your "Config" sheet with feedback questions:

| Column A | Column B |
|----------|----------|
| Question 1 | How would you rate this event? |
| Option | Excellent |
| Option | Good |
| Option | Fair |
| Question 2 | Would you recommend? |
| Option | Yes |
| Option | No |
| Question 3 | Will you attend next event? |
| Option | Definitely |
| Option | Maybe |
| Option | No |

#### Feedback Sheet
Responses are automatically saved with structure:

| Column A | Column B | Column C | Column D |
|----------|----------|----------|----------|
| Timestamp | Question 1 | Question 2 | Question 3 |
| 2026-05-11T10:30:00Z | Excellent | Yes | Definitely |

## Project Structure

```
diploma-app/
├── README.md                          # This file
├── FEEDBACK_CONFIG.md                 # Google Sheets setup guide
├── index.html                         # HTML entry point (42 lines)
├── css/
│   └── style.css                     # All application styles
├── js/                               # ES6 modules (no build step needed)
│   ├── main.js                       # App initialization
│   ├── config.js                     # Constants & state
│   ├── api.js                        # Backend communication
│   ├── canvas.js                     # Canvas drawing & image loading
│   ├── feedback.js                   # Feedback form logic
│   └── diploma.js                    # Diploma generation & email
├── assets/
│   └── diploma_final.jpg             # Diploma template image
└── backend/
    ├── server.js                     # Express app entry point
    ├── config.js                     # Configuration constants
    ├── utils.js                      # Validation & helpers
    ├── package.json
    ├── .env                          # Environment variables (gitignored)
    ├── .env.example                  # Template for .env
    ├── middleware/
    │   └── auth.js                   # JWT token handling
    ├── services/
    │   ├── googleSheets.js           # Google Sheets API
    │   └── email.js                  # Gmail API integration
    └── routes/
        └── api.js                    # All API endpoints
```

## API Endpoints

All endpoints are relative to backend server (default: `http://localhost:8080`)

### GET `/`
Serves the main application HTML.
- **Response**: HTML page

### GET `/health`
Health check endpoint.
- **Response**: `{ ok: true }`

### GET `/diploma-image`
Serves the diploma template image.
- **Response**: JPEG image
- **Headers**: `Content-Type: image/jpeg`, caching enabled

### GET `/app-config`
Retrieves application configuration and feedback questions.
- **Response**:
  ```json
  {
    "enableEmailFeature": true,
    "enableFeedbackGate": true,
    "feedbackQuestions": [
      {
        "id": "q1",
        "text": "How would you rate this event?",
        "options": ["Excellent", "Good", "Fair"]
      }
    ]
  }
  ```

### POST `/submit-feedback`
Submit anonymous feedback and receive a JWT token.
- **Request Body**:
  ```json
  {
    "responses": {
      "q1": "Excellent",
      "q2": "Yes"
    }
  }
  ```
  `responses` is dynamic: include one key per configured question (`q1`, `q2`, ..., `qN`).
- **Response**:
  ```json
  {
    "ok": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Status Codes**:
  - `200`: Success
  - `400`: Missing/invalid responses
  - `500`: Server error or Sheets API failure

### POST `/generate-diploma`
Generate a diploma PDF with participant name. Requires feedback token if `ENABLE_FEEDBACK_GATE=true`.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "canvasImageBase64": "data:image/jpeg;base64,...",
    "feedbackToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response**: PDF blob (binary)
- **Headers**: `Content-Type: application/pdf`, `Content-Disposition: attachment`
- **Status Codes**:
  - `200`: PDF generated successfully
  - `400`: Missing/invalid parameters
  - `403`: Invalid or missing feedback token
  - `500`: PDF generation error

### POST `/send-diploma-email`
Send diploma PDF via email. Requires feedback token if `ENABLE_FEEDBACK_GATE=true`.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "fileName": "Diploma - John Doe.pdf",
    "pdfBase64": "JVBERi0xLjQKJeLjz9MNCjEgMCBvYmo=...",
    "feedbackToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response**:
  ```json
  {
    "ok": true
  }
  ```
- **Status Codes**:
  - `200`: Email sent successfully
  - `400`: Invalid email or missing parameters
  - `403`: Invalid or missing feedback token
  - `413`: PDF payload too large (>8MB)
  - `500`: Gmail API error

## User Flow

1. **User visits application** → Loads config from backend
2. **Feedback form displayed** → Questions populated from Google Sheets
3. **User answers all configured questions** → Frontend validates responses
4. **Submit feedback** → POST to `/submit-feedback` endpoint
5. **Backend validates & saves** → Stores timestamp + all answers to Google Sheets, returns JWT token
6. **Token stored in sessionStorage** → Persists during browser session
7. **Diploma step shown** → User enters name
8. **Canvas preview updates** → Text auto-sizes to fit diploma
9. **User downloads OR emails diploma**:
   - **Download**: Canvas → PDF via `/generate-diploma` endpoint, browser downloads
   - **Email**: Canvas → PDF → base64 → POST to `/send-diploma-email`, Gmail API sends

## Development

### Frontend
- Pure ES6 modules (no build step required)
- Files load directly in browser via `<script type="module">`
- All modules cached in `js/` directory
- CSS extracted to `css/style.css`

### Backend
- Express.js server with modular structure
- Services: Google Sheets API, Gmail API, JWT authentication
- Routes: 6 endpoints with proper error handling
- Caching: 5-minute TTL on Config sheet queries

### Running Locally
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Browser
open http://localhost:8080
```

## Deployment

### Render.com (Recommended - Free Tier Compatible)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Render Service**
   - Connect GitHub repository
   - Set Build Command: `cd backend && npm install`
   - Set Start Command: `cd backend && npm start`
   - Add Environment Variables from `.env` file

3. **Deploy**
   - Render automatically builds and deploys on `git push`
   - Update frontend `CORS_ORIGIN` in `api.js` to your Render URL

### Vercel (Frontend Only - Requires Separate Backend)

If you deploy backend separately:
1. Build frontend for static hosting
2. Update API endpoints in `js/config.js`
3. Deploy to Vercel, Netlify, or GitHub Pages

## Security Notes

- **JWT Tokens**: Signed with `JWT_SECRET` (change in production)
- **Feedback Gating**: Prevents diploma access without token
- **Email Validation**: Server-side validation of email format
- **File Sanitization**: Diploma filenames sanitized to prevent injection
- **Google Sheets**: Separate read/write permissions via service account
- **Session Storage**: Tokens stored in sessionStorage (cleared when tab closes)
- **CORS**: Configure `CORS_ORIGIN` for your deployment domain

## Troubleshooting

### "Diploma image not found"
- Ensure `diploma_final.jpg` exists in `/assets` folder
- Check `DIPLOMA_IMAGE_FILE` env variable matches filename

### "Feedback configuration not found"
- Verify Google Sheets credentials in `.env`
- Check `FEEDBACK_SHEET_ID` is correct
- Ensure "Config" sheet exists and has proper format
- Verify service account has read access to spreadsheet

### "Email not configured" or "Email failed to send"
- If `ENABLE_EMAIL_FEATURE=false`, email button won't show
- Check Gmail API credentials and refresh token
- Verify less-secure apps enabled on Google account (if applicable)
- Check that service account email has access to Gmail API

### Feedback form not loading
- Open browser DevTools → Network tab
- Check `/app-config` request succeeds
- Verify `feedbackQuestions` array is populated
- Check console for errors (Ctrl+Shift+J)

### "Failed to fetch" errors
- Verify backend is running (`npm start`)
- Check `CORS_ORIGIN` environment variable
- Ensure frontend URL matches CORS policy

## Support

For issues with:
- **Google Sheets Setup**: See [FEEDBACK_CONFIG.md](FEEDBACK_CONFIG.md)
- **Frontend**: Check browser console for errors
- **Backend**: Check Node.js console for errors
- **Deployment**: Refer to specific platform documentation

## License

Internal use only - Rotary Club Pitești Unity

## Changelog

### v1.0.0 (Current)
- Complete refactoring: modular frontend (ES6) and backend (Node.js)
- Anonymous feedback with JWT token gating
- Server-side PDF generation and email distribution
- Dynamic question configuration via Google Sheets
- Canvas-based diploma preview with auto-sizing
