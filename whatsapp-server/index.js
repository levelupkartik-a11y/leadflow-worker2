const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'leadflow_secret_key_2026';
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, 'auth_info');

app.use(cors());
app.use(express.json());

let sock = null;
let currentQR = null;
let connectionState = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let connectedUser = null;

async function startWhatsApp() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[WhatsApp Gateway] Starting Baileys version ${version.join('.')}...`);
    connectionState = 'connecting';

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['LeadFirst AI Outreach', 'Chrome', '124.0.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQR = await qrcode.toDataURL(qr, { margin: 2, scale: 7 });
          console.log('[WhatsApp Gateway] New QR code generated. Visit / to scan.');
        } catch (e) {
          console.error('[WhatsApp Gateway] QR generation error:', e.message);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        connectionState = 'disconnected';
        connectedUser = null;
        console.log(`[WhatsApp Gateway] Connection closed (${statusCode}). Reconnecting: ${shouldReconnect}`);

        if (shouldReconnect) {
          setTimeout(startWhatsApp, 3000);
        } else {
          console.log('[WhatsApp Gateway] Device logged out. Clearing credentials to generate fresh QR...');
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch (e) {}
          setTimeout(startWhatsApp, 2000);
        }
      } else if (connection === 'open') {
        connectionState = 'connected';
        currentQR = null;
        connectedUser = sock.user?.id ? sock.user.id.split(':')[0] : 'Linked Device';
        console.log(`[WhatsApp Gateway] 🟢 Successfully connected as: +${connectedUser}`);
      }
    });

  } catch (err) {
    console.error('[WhatsApp Gateway] Initialization error:', err.message);
    connectionState = 'disconnected';
    setTimeout(startWhatsApp, 5000);
  }
}

// ─────────────── HTTP ROUTES ───────────────

// 1. Health check for Render / Koyeb
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connection: connectionState,
    connectedUser: connectedUser ? `+${connectedUser}` : null
  });
});

// 2. Status API
app.get('/status', (req, res) => {
  res.json({
    connected: connectionState === 'connected',
    state: connectionState,
    phone: connectedUser ? `+${connectedUser}` : null
  });
});

// 3. Web UI for one-click QR scanning
app.get('/', (req, res) => {
  if (connectionState === 'connected') {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LeadFirst WhatsApp Gateway - Connected</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0c10; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; text-align: center; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; color: #4ade80; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; }
          h1 { margin: 0 0 10px; font-size: 24px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; }
          .phone { font-size: 20px; font-weight: bold; color: #f59e0b; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● Online & Ready</div>
          <h1>LeadFirst Gateway Connected</h1>
          <p>Your WhatsApp Business account is actively linked to the cloud gateway.</p>
          <div class="phone">+${connectedUser}</div>
          <p style="font-size: 13px; color: #64748b;">Autonomous outreach requests from your LeadFlow Worker will dispatch directly from this number.</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LeadFirst WhatsApp Gateway - Scan QR</title>
      <meta http-equiv="refresh" content="5">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0c10; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 36px; text-align: center; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .qr-box { background: #fff; padding: 16px; border-radius: 12px; display: inline-block; margin: 20px 0; }
        .qr-box img { display: block; max-width: 260px; height: auto; }
        h1 { margin: 0 0 10px; font-size: 22px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0; }
        .steps { text-align: left; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 14px; margin-top: 20px; font-size: 13px; color: #cbd5e1; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin: 4px 0; }
        .spinner { display: inline-block; width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.1); border-radius: 50%; border-top-color: #f59e0b; animation: spin 1s linear infinite; margin: 30px 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Connect WhatsApp Business</h1>
        <p>Scan this QR code with your phone to link your business number for automated outreach.</p>
        
        ${currentQR 
          ? `<div class="qr-box"><img src="${currentQR}" alt="WhatsApp QR Code" /></div>` 
          : `<div class="spinner"></div><p style="color:#f59e0b;">Generating fresh QR code...</p>`
        }
        
        <div class="steps">
          <ol>
            <li>Open <strong>WhatsApp Business</strong> on your phone</li>
            <li>Tap <strong>Settings</strong> (or ⋮ on Android) → <strong>Linked Devices</strong></li>
            <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
          </ol>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 14px;">This page refreshes automatically every 5 seconds.</p>
      </div>
    </body>
    </html>
  `);
});

// 4. Send Message Endpoint (Called by GitHub Actions / Leadflow Worker)
app.post('/send', async (req, res) => {
  const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
  const providedKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : req.query.api_key;

  if (providedKey !== API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API key' });
  }

  if (connectionState !== 'connected' || !sock) {
    return res.status(503).json({ success: false, error: 'WhatsApp is not connected. Visit / to scan QR code.' });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields: "to" and "message"' });
  }

  const digits = to.toString().replace(/\D/g, '');
  if (digits.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid recipient phone number' });
  }

  const jid = `${digits}@s.whatsapp.net`;

  try {
    const result = await sock.sendMessage(jid, { text: message });
    console.log(`[WhatsApp Gateway] Sent message to ${digits} (ID: ${result?.key?.id})`);
    return res.json({
      success: true,
      messageId: result?.key?.id,
      to: digits
    });
  } catch (err) {
    console.error(`[WhatsApp Gateway] Send failed to ${digits}:`, err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

startWhatsApp();

app.listen(PORT, () => {
  console.log(`[WhatsApp Gateway] Server running on port ${PORT}`);
});
