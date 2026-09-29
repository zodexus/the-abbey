# The Abbey — Tembusu College Bandroom Portal 🎸

A modern, automated bandroom booking, door-opening duty coordination, and equipment loan management system built for the **Tembusu College Arts Committee**.

Designed specifically to eliminate Quartermaster (QM) burnout, replace manual Telegram/Notion scheduling, and coordinate door opening duties across the entire Arts CC and Residential Assistants (RAs).

---

## 🌟 Key Features

### 1. Interactive 7-Day Live Schedule Grid
- Real-time slot availability from **09:00 to 24:00**.
- **Recurring Slot Reservations**: Automatically locks out fixed interest group slots like **tKaraoke (Fridays 8 PM – 12 AM)** and **tGrapevine podcast sessions**.
- Built-in **2-hour session quota** and 7-day advance booking window to prevent slot hoarding.
- Mobile-friendly responsive view designed for residents booking from their phones.

### 2. Automated Telegram Door-Opening Dispatch
- When a resident confirms a booking on the portal, an automated message is dispatched to the **Arts CC Telegram Group**.
- **Interactive Inline Button:** `[ 🔑 I can open the Abbey ]` allows any Arts CC member currently in hall to claim the opening duty with one tap.
- Avoids duplicate trips: The Telegram message updates in real time to show `✅ Claimed by @sarah_arts`, and the resident is informed who is coming down.
- **You (the QM) no longer have to manually coordinate every door opening!**

### 3. End-of-Session Photo Check-Out & Upkeep Tracking
- 15 minutes before a session ends, the Telegram bot automatically sends the resident a clean-up checklist (coiling cables, powering off amps, mic storage).
- The resident replies directly with a **photo of the bandroom**.
- The photo is logged with a timestamp in the Quartermaster audit gallery, solving the problem of untracked gear mishandling.

### 4. AY26/27 Licensing Whitelist
- Enforces college bandroom licensing policy.
- Real-time check against the AY26/27 licensing database.
- Residents who missed the Sem 1 licensing briefing are prompted with clear guidance to liaise with QM & Tech members.

### 5. Equipment Loan Request Portal
- Dedicated module for microphone, cable, and portable PA loans for house events and IGs.
- Enforces the **7-day advance notice rule** to prevent last-minute, night-before requests.

### 6. Concert Crunch Mode Switch
- Toggle between **Normal FCFS Mode** and **Concert Mode** (prioritizes official concert acts and enforces tighter practice quotas during peak festival periods).

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js 18+ (tested on Node 20 / 25)
- npm or pnpm

### Run Locally:
```bash
# Clone the repository
git clone <repo-url>
cd sharp-franklin

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🤖 Connecting the Telegram Bot (Takes 2 Minutes)

You can run the portal with full simulated Telegram previews out of the box. To connect your actual Arts CC Telegram group:

1. **Create the Bot with `@BotFather`**:
   - Open Telegram and search for `@BotFather`.
   - Send `/newbot`, choose a name (e.g. `Tembusu Abbey Bot`) and username (e.g. `TembusuAbbeyBot`).
   - Copy the HTTP API token.

2. **Add Bot to Arts CC Group Chat**:
   - Add the bot to your Arts CC or Abbey Door Duty group chat.
   - Make the bot an administrator so it can send messages and listen for callbacks.

3. **Get the Group Chat ID**:
   - Add `@RawDataBot` to the group to see the chat ID (starts with `-100...`).
   - Or run `curl https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` after sending a test message in the group.

4. **Add to `.env.local`**:
   ```env
   TELEGRAM_BOT_TOKEN="123456789:ABCdefGHIjklMNO..."
   TELEGRAM_ARTS_CC_CHAT_ID="-100123456789"
   NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
   ```

5. **Register Webhook** (once deployed):
   ```bash
   curl -F "url=https://your-domain.vercel.app/api/telegram/webhook" https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook
   ```

---

## ☁️ 100% Free Deployment on Vercel

1. Push your repository to **GitHub**.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. Add your `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ARTS_CC_CHAT_ID` under **Environment Variables**.
5. Click **Deploy**. Vercel will build and deploy your app with a free HTTPS domain (e.g. `tembusu-abbey.vercel.app`).

---

## 📋 Quartermaster Handover Reference
- **Inventory & Recurring Loans**:
  - `tKaraoke`: Fridays 8 PM – 12 AM (2 monitors, 2 mics, 2 XLRs, 2 1/4" cables).
  - `tGrapevine`: Handled in coordination with podcast heads.
- **Room Access**: All Arts CC members and RAs have card access. Always remind the team to share the door-opening duties so it doesn't fall solely on the QM.
