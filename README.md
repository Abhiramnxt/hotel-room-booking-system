<div align="center">

</div>

# Sai Nirvana Plaza Booking System

A state-of-the-art hotel booking, operations, front desk, and analytics management dashboard designed for Sai Nirvana Plaza (Dwarka, New Delhi). Features intelligent guest chatbots, instant simulated/live Meta WhatsApp Cloud API communications, SendGrid email notifications, automated GST invoice PDF generation, and active stay telemetry.

---

## 🚀 Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (Node Package Manager)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy the existing `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in the environment variable values:
- `GEMINI_API_KEY`: Required for AI guest chatbots and priority classifications.
- `APP_URL`: Your local or hosted app URL.
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`: Credentials for Meta WhatsApp Cloud API (simulation mode operates if blank).
- `SENDGRID_API_KEY`, `SENDGRID_SENDER_EMAIL`: Credentials for SendGrid Email dispatch (simulation mode operates if blank).

### Step 3: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build and Run

To build and run the optimized production bundle locally:
```bash
# Compile client assets and bundle Express backend
npm run build

# Start the compiled Express server
npm run start
```

---

## ☁️ Deploying to Vercel

This project is fully prepared for zero-config deployment on Vercel as a hybrid application with static frontend routing and Express serverless functions.

### Steps to Deploy

1. **Push code to GitHub**: Create a repository and push your workspace. The secure `.gitignore` will automatically prevent local `.env` configuration from being exposed.
2. **Import Project to Vercel**: Connect your GitHub account to Vercel, import the repository, and select **Vite** (or **Other**) as the framework.
3. **Configure Build Settings**: Vercel automatically detects build commands. Verify the settings match:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**: Add all variables defined in `.env.example` to the **Environment Variables** section of your Vercel Project Settings:
   - `GEMINI_API_KEY`
   - `APP_URL` (Set this to your Vercel deployment domain, e.g., `https://your-app.vercel.app`)
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `SENDGRID_API_KEY`
   - `SENDGRID_SENDER_EMAIL`
5. **Deploy**: Click **Deploy**. Vercel will build the Vite client, register the Express server under the serverless `/api` path via `vercel.json` rewrites, and launch the site.

---

## 🔒 Security & Source Control

- **Environment Isolation**: No production tokens, credentials, or API keys are committed to the codebase.
- **Git Protection**: The `.gitignore` excludes `.env`, `.env.*` (except `.env.example`), `.vercel/` metadata, and local diagnostic logs to prevent security leaks.
