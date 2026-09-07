# LeadFirst Cloud WhatsApp Gateway

A lightweight, free, standalone cloud gateway built with Express and `@whiskeysockets/baileys`. It links your physical phone's WhatsApp Business app to a secure cloud API so your automated LeadFlow worker can send outreach pitches with **zero laptop resources** and **zero subscription fees**.

---

## 🚀 1-Minute Free Cloud Deployment (Render)

1. Sign up / log in to [Render.com](https://render.com) (100% Free).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository: `levelupkartik-a11y/leadflow-worker2`.
4. Configure service settings:
   - **Name**: `leadflow-whatsapp-gateway`
   - **Root Directory**: `whatsapp-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   - `API_KEY`: `leadflow_secret_key_2026` (or any custom secret key you prefer)
6. Click **Create Web Service**.

---

## 📱 How to Connect Your Phone:

1. Once Render finishes deploying, it gives you a live URL (e.g. `https://leadflow-whatsapp-gateway.onrender.com`).
2. Open that URL in any browser (on your phone or computer).
3. You will see a large **QR Code**.
4. Open **WhatsApp Business** on your phone:
   - Go to **Settings** (or ⋮ on Android) → **Linked Devices** → **Link a Device**.
   - Scan the QR code.
5. The web page will immediately turn green: **🟢 Online & Ready: +91 XXXXX XXXXX**.
6. That's it! Your phone is connected in the cloud 24/7.

---

## ⚙️ Connecting to LeadFlow Worker:

In your `leadflow-worker2` `.env` (and GitHub Actions Secrets on `levelupkartik-a11y/leadflow-worker2`):
- `WHATSAPP_API_URL`: `https://your-service-name.onrender.com/send`
- `WHATSAPP_TOKEN`: `leadflow_secret_key_2026`
