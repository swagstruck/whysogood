# Feedback System — Setup Guide

## What you need to do (one-time, ~5 minutes)

### Step 1 — Create the Apps Script

1. Open **[script.google.com](https://script.google.com)** and click **New project**
2. Delete the existing code, then **paste the entire contents** of `FEEDBACK_SCRIPT.gs`
3. Click **Save** (Ctrl+S) — name the project `whysogood-feedback`

### Step 2 — Deploy as a Web App

1. Click **Deploy → New deployment**
2. Click the ⚙️ gear next to **Type** → choose **Web app**
3. Set:
   - **Description**: `Feedback collector v1`
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone` ← important, must be Anyone
4. Click **Deploy**
5. Google will ask you to authorize — click through
6. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfyc.../exec
   ```

### Step 3 — Set the environment variable

Open `.env.local` (in the project root) and paste the URL:

```env
NEXT_PUBLIC_FEEDBACK_ENDPOINT=https://script.google.com/macros/s/AKfyc.../exec
```

### Step 4 — Rebuild and redeploy

```bash
npm run build
git add -A
git commit -m "chore: add feedback endpoint"
git push ...
```

---

## How the data is stored

Your Google Sheet (`1rO29dXXfRcmwKAAeC3B9AWyvNgFLeS0gEdUK4AmUuIk`) will get rows like:

| Timestamp (IST)      | URL                                  | Priority     | Feedback                          |
|----------------------|--------------------------------------|--------------|-----------------------------------|
| 2026-09-22 21:30:00  | https://whysogood.app/tools/pdf-merger | Must have  | Add batch merge support           |
| 2026-09-22 21:45:00  | https://whysogood.app/images         | Good to have | Favicon from logo tool            |

---

## Updating the script later

If you change `FEEDBACK_SCRIPT.gs`, redeploy:
- Apps Script editor → **Deploy → Manage deployments → Edit → New version → Deploy**

> The Web App URL stays the same across versions.
