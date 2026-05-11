# Feedback Configuration via Google Sheets

The feedback questions and options are now loaded dynamically from a Google Sheet. This allows you to change questions without redeploying the app.

## Google Sheets Setup

### Sheet Structure

Your feedback Google Sheet should have **two sheets**:

### Direct Google Sheet Link

Use this URL format to open your sheet directly:

`https://docs.google.com/spreadsheets/d/<FEEDBACK_SHEET_ID>/edit`

If your `FEEDBACK_SHEET_ID` is set in `.env`, replace `<FEEDBACK_SHEET_ID>` with that value.

Current configured sheet link:

https://docs.google.com/spreadsheets/d/1BX2fMs4K1yyFiewLA71lWYVKSMQl6GCbsHc0Ee5Mg-c/edit

#### 1. **Config** sheet (default name, customizable via `CONFIG_SHEET_NAME` env var)

This sheet defines the questions and answer options.

| Column A    | Column B                              |
|-------------|---------------------------------------|
| Question 1  | Cât de util ți s-a părut evenimentul? |
| Option      | Foarte util                           |
| Option      | Util                                  |
| Option      | Acceptabil                            |
| Option      | Slab                                  |
| Question 2  | Cum a fost claritatea prezentărilor?   |
| Option      | Foarte clară                          |
| Option      | Clară                                 |
| Option      | Neutră                                |
| Option      | Neclară                               |
| Question 3  | Ai recomanda acest eveniment altor?   |
| Option      | Da, sigur                             |
| Option      | Probabil da                           |
| Option      | Nu sunt sigur(ă)                      |
| Option      | Nu                                    |

**Format rules:**
- Column A must start with "Question N" (case-insensitive) for each new question
- Rows after a question until the next "Question" are treated as options
- Empty rows are skipped
- The sheet is cached for 5 minutes to avoid excessive API calls

#### 2. **Feedback** sheet (default name, customizable via `FEEDBACK_SHEET_NAME` env var)

This sheet stores submitted feedback responses.

| Column A | Column B | Column C | Column D | Column E | ... |
|----------|----------|----------|----------|----------|-----|
| Timestamp | q1_answer | q2_answer | q3_answer | q4_answer | ... |
| 11/05/2026 20:05 | Foarte util | Foarte clară | Da, sigur | Probabil da | ... |

New responses are appended automatically after each feedback submission, for as many questions as are defined in the **Config** sheet.

## Environment Variables

Add these to your `.env` or Render dashboard:

```bash
# Feedback storage & config
FEEDBACK_SHEET_ID=your-sheet-id-here
FEEDBACK_SHEET_NAME=Feedback           # optional, default: 'Feedback'
CONFIG_SHEET_NAME=Config               # optional, default: 'Config'
FEEDBACK_GOOGLE_CLIENT_EMAIL=your-service-account-email@...
FEEDBACK_GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Token gating
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=24h                         # optional, default: '24h'
ENABLE_FEEDBACK_GATE=true              # optional, default: true
```

## How It Works

1. **On app load**: Frontend fetches `/app-config` which includes `feedbackQuestions` (loaded from the Config sheet)
2. **Form is built dynamically** based on the questions structure
3. **On form submit**: Responses are validated against the Config sheet options
4. **On successful submit**: 
  - Data is appended to the Feedback sheet (timestamp + all configured answers)
   - A JWT token is issued (valid for 24h by default)
   - Token is stored in sessionStorage on the client
5. **On diploma request**: Token must be included or request is rejected with 403
6. **Cache behavior**: Config is cached for 5 minutes to avoid API rate limits

## Google Cloud Setup (Service Account)

1. Create a **Service Account** in Google Cloud Console
2. Generate a **JSON key** for the service account
3. Extract:
   - `client_email` → `FEEDBACK_GOOGLE_CLIENT_EMAIL`
   - `private_key` → `FEEDBACK_GOOGLE_PRIVATE_KEY` (keep the `\n` in env vars)
4. **Share the Google Sheet** with the service account email (Editor access)
5. Grant the service account these scopes:
   - `https://www.googleapis.com/auth/spreadsheets` (append feedback)
   - `https://www.googleapis.com/auth/spreadsheets.readonly` (read config)

## Testing Locally

```bash
# Start the backend
cd backend
npm install
cp .env.example .env
# Edit .env with your Google credentials
npm start
```

The `/app-config` endpoint will return the questions. Try:
```bash
curl http://localhost:8080/app-config
```

You should see:
```json
{
  "enableEmailFeature": true,
  "enableFeedbackGate": true,
  "feedbackQuestions": [
    {
      "id": "q1",
      "text": "Cât de util ți s-a părut evenimentul?",
      "options": ["Foarte util", "Util", ...]
    },
    ...
  ]
}
```
