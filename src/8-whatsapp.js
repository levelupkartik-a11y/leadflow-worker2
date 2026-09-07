const { composioExecute, withTimeout } = require('./utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';

/**
 * Normalizes phone numbers to standard international format (E.164 without leading plus for some APIs, or with +).
 * Returns { valid: boolean, formatted: string, isLandline: boolean, reason?: string }
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, formatted: '', isLandline: false, reason: 'No phone number provided' };
  }

  // Remove whitespace, dashes, parens, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '').trim();

  // If starts with +, strip + temporarily for numeric checks
  const hasPlus = cleaned.startsWith('+');
  let digits = cleaned.replace(/\D/g, '');

  // Detect Indian landline area codes (e.g. 0172 for Chandigarh / Panchkula / Mohali)
  // Landlines typically start with 01.. or +911.. and are not 10-digit mobile (which start with 6, 7, 8, 9)
  if (digits.startsWith('91172') || digits.startsWith('0172') || (digits.startsWith('172') && digits.length <= 10)) {
    return { valid: false, formatted: cleaned, isLandline: true, reason: 'Landline number detected (not a mobile number)' };
  }

  // If 10 digits starting with 6, 7, 8, 9 -> standard Indian mobile
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.substring(1))) {
    digits = `91${digits.substring(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.substring(2))) {
    // Already in 91XXXXXXXXXX format
  } else if (digits.length < 10) {
    return { valid: false, formatted: cleaned, isLandline: false, reason: 'Phone number has insufficient digits' };
  }

  return {
    valid: true,
    formatted: `+${digits}`,
    digitsOnly: digits,
    isLandline: false
  };
}

/**
 * Builds high-converting personalized pitch copy for WhatsApp.
 * Uses Dean Jackson SPEAR framework (Short, Personal, Expecting A Reply)
 * and Chris Voss No-Oriented CTA for maximum reply rates.
 */
function buildWhatsAppPitch(businessName, targetUrl, rating = '', category = '', pitchType = 'website', sheetName = '') {
  // Clean the business name (strip branch suffixes, city names, pipes)
  const cleanName = businessName 
    ? businessName.split('-')[0].split('|')[0].split(',')[0].trim() 
    : 'there';

  const cleanCategory = category ? category.toLowerCase().replace(/[^a-zA-Z0-9\s&]/g, '').trim() : 'services';
  const areaPhrase = sheetName && sheetName !== 'Config' ? ` in ${sheetName}` : '';
  const ratingPhrase = (rating && parseFloat(rating) >= 4.0) ? ` Loved the ${rating}★ reviews.` : '';

  if (pitchType === 'ads') {
    // ─────────────── PITCH FOR BUSINESSES WITH AN EXISTING WEBSITE ───────────────
    return `Hey ${cleanName} team, checked out your site (${targetUrl}) after seeing your Google Maps profile${areaPhrase} — really solid setup.

Quick observation: looks like you're missing out on 20-30+ direct customer inquiries every month from people searching for ${cleanCategory} in your area on Instagram and Google.

I put together 2 quick growth ideas to help you capture those leads (strictly performance-based, zero monthly retainer lock-ins).

Mind if I send over a quick 2-minute breakdown, or is your schedule completely full right now?`;
  }

  // ─────────────── PITCH FOR BUSINESSES WITHOUT A WEBSITE ───────────────
  return `Hey ${cleanName} team, came across your place on Google Maps${areaPhrase}.${ratingPhrase}

Noticed you guys don't have a direct website linked on your Maps profile, so I took a few minutes and put together a fast mobile preview for you to check out:

${targetUrl}

Built it with your real photos, reviews, and a 1-tap WhatsApp booking button so people searching for ${cleanCategory} don't bounce to competitors.

Worth a 2-min look, or do you already have someone handling your web stuff?`;
}

/**
 * Dispatches WhatsApp message across available providers with graceful fallback.
 */
async function sendWhatsAppPitch(phone, businessName, targetUrl, rating = '', category = '', rowId = null, sheetName = null, pitchType = 'website') {
  console.log(`[Step 8] Starting WhatsApp outreach (${pitchType.toUpperCase()} PITCH) for "${businessName}"...`);

  // Test mode safeguard: if TEST_OUTREACH_PHONE is set, divert outgoing message
  let dispatchPhone = phone;
  const isTestMode = !!process.env.TEST_OUTREACH_PHONE;
  if (isTestMode) {
    console.log(`[Step 8] ⚠️ TEST MODE ACTIVE: Diverting message from "${phone}" to personal test number "${process.env.TEST_OUTREACH_PHONE}"`);
    dispatchPhone = process.env.TEST_OUTREACH_PHONE;
  }

  // 1. Phone number validation
  const phoneInfo = normalizePhoneNumber(dispatchPhone);
  if (!phoneInfo.valid) {
    console.log(`[Step 8] Skipping WhatsApp: ${phoneInfo.reason} (Raw: "${dispatchPhone}")`);
    if (rowId && sheetName && !isTestMode) {
      await updateWhatsAppSheetStatus(sheetName, rowId, `SKIPPED: ${phoneInfo.reason}`);
    }
    return { success: false, skipped: true, reason: phoneInfo.reason };
  }

  // 2. Validate URL (if website pitch, requires valid live url)
  if (pitchType === 'website' && (!targetUrl || !targetUrl.startsWith('http'))) {
    console.log(`[Step 8] Skipping WhatsApp: Invalid or missing live website URL ("${targetUrl}")`);
    if (rowId && sheetName && !isTestMode) {
      await updateWhatsAppSheetStatus(sheetName, rowId, 'SKIPPED: No live website URL');
    }
    return { success: false, skipped: true, reason: 'No live website URL' };
  }

  const messageText = buildWhatsAppPitch(businessName, targetUrl, rating, category, pitchType, sheetName);
  console.log(`[Step 8] Target Phone: ${phoneInfo.formatted}`);
  console.log(`[Step 8] Message Preview:\n---\n${messageText}\n---`);

  // 3. Provider Dispatch Logic
  let dispatchResult = null;

  // Check for Dry Run mode
  if (process.env.DRY_RUN_WHATSAPP === 'true') {
    console.log('[Step 8] [DRY RUN] DRY_RUN_WHATSAPP is enabled. Simulated successful dispatch.');
    dispatchResult = { success: true, simulated: true, provider: 'dry-run' };
  }

  // Provider A: Free Cloud-Hosted WhatsApp Gateway (Sends from your real phone number via Baileys)
  else if (process.env.WHATSAPP_API_URL) {
    try {
      console.log('[Step 8] Sending via Free Cloud WhatsApp Gateway...');
      const targetUrl = process.env.WHATSAPP_API_URL.endsWith('/send')
        ? process.env.WHATSAPP_API_URL
        : `${process.env.WHATSAPP_API_URL.replace(/\/$/, '')}/send`;

      const headers = { 'Content-Type': 'application/json' };
      if (process.env.WHATSAPP_TOKEN) {
        headers['x-api-key'] = process.env.WHATSAPP_TOKEN;
      }

      const res = await withTimeout(
        fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            token: process.env.WHATSAPP_TOKEN,
            to: phoneInfo.digitsOnly,
            message: messageText,
            body: messageText
          })
        }),
        30000,
        'Free Cloud WhatsApp Gateway'
      );
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.error || JSON.stringify(json));
      dispatchResult = { success: true, provider: 'cloud-gateway', messageId: json.messageId };
    } catch (err) {
      console.error('[Step 8] Free Cloud WhatsApp Gateway failed:', err.message);
      dispatchResult = { success: false, error: err.message };
    }
  }

  // Provider B: Meta WhatsApp Cloud API (Graph API)
  else if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      console.log('[Step 8] Sending via Meta WhatsApp Cloud API...');
      const graphUrl = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      
      const cleanName = businessName 
        ? businessName.split('-')[0].split('|')[0].split(',')[0].trim() 
        : 'there';

      const templateName = (pitchType === 'ads') 
        ? (process.env.WHATSAPP_ADS_TEMPLATE || 'leadflow_ads_pitch')
        : (process.env.WHATSAPP_WEBSITE_TEMPLATE || 'leadflow_website_pitch');

      const useTemplate = process.env.WHATSAPP_USE_TEXT !== 'true';

      const requestBody = useTemplate ? {
        messaging_product: 'whatsapp',
        to: phoneInfo.digitsOnly,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: cleanName },
                { type: 'text', text: targetUrl || 'https://leadfirstai.com' }
              ]
            }
          ]
        }
      } : {
        messaging_product: 'whatsapp',
        to: phoneInfo.digitsOnly,
        type: 'text',
        text: { body: messageText }
      };

      const res = await withTimeout(
        fetch(graphUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }),
        30000,
        'Meta WhatsApp API'
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
      dispatchResult = { success: true, provider: 'meta-cloud-api', messageId: json.messages?.[0]?.id };
    } catch (err) {
      console.error('[Step 8] Meta WhatsApp Cloud API failed:', err.message);
      dispatchResult = { success: false, error: err.message };
    }
  }

  // Provider C: Composio WhatsApp Tool
  else if (process.env.COMPOSIO_API_KEY && process.env.ENABLE_COMPOSIO_WHATSAPP === 'true') {
    try {
      console.log('[Step 8] Sending via Composio WhatsApp Tool...');
      const composioRes = await composioExecute('WHATSAPP_SEND_MESSAGE', {
        recipient: phoneInfo.digitsOnly,
        message: messageText
      });
      dispatchResult = { success: true, provider: 'composio', data: composioRes };
    } catch (err) {
      console.warn('[Step 8] Composio WhatsApp Tool execution returned:', err.message);
      dispatchResult = { success: false, error: err.message };
    }
  }

  // Provider D: Fallback Simulator Mode (Safe default when no active credentials configured)
  else {
    console.log('[Step 8] No active live WhatsApp credentials found in environment. Running in SIMULATOR mode.');
    dispatchResult = {
      success: true,
      simulated: true,
      provider: 'simulator',
      note: 'To send live messages, set WHATSAPP_ACCESS_TOKEN & WHATSAPP_PHONE_NUMBER_ID or DRY_RUN_WHATSAPP=true'
    };
  }

  // 4. Update status in Google Sheet
  if (rowId && sheetName) {
    const statusText = dispatchResult.success 
      ? (dispatchResult.simulated ? 'SIMULATED (Ready for Live)' : 'SENT')
      : `FAILED: ${dispatchResult.error || 'Unknown error'}`;

    await updateWhatsAppSheetStatus(sheetName, rowId, statusText);
  }

  return dispatchResult;
}

/**
 * Updates Google Sheet with WhatsApp outreach status and updates Status column to Outreached/Pitched.
 */
async function updateWhatsAppSheetStatus(sheetName, rowId, statusText) {
  try {
    const isSheet1 = sheetName === 'Sector 17 Chandigarh';
    const statusCol = isSheet1 ? 'N' : 'O';

    // 1. Ensure header exists
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: sheetName,
      first_cell_location: `${statusCol}1`,
      value_input_option: 'RAW',
      values: [['WhatsApp Status']]
    });

    // 2. Write status to row
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID,
      sheet_name: sheetName,
      first_cell_location: `${statusCol}${rowId}`,
      value_input_option: 'RAW',
      values: [[statusText]]
    });

    // 3. For Sheet 2+, if sent/simulated, update Column H ("Status") from "New" to "Outreached"
    if (!isSheet1 && (statusText === 'SENT' || statusText.startsWith('SIMULATED'))) {
      await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
        spreadsheet_id: SPREADSHEET_ID,
        sheet_name: sheetName,
        first_cell_location: `H${rowId}`,
        value_input_option: 'RAW',
        values: [['Outreached']]
      });
    }

    console.log(`[Step 8] Successfully recorded WhatsApp status ("${statusText}") in Sheet "${sheetName}" row ${rowId}.`);
  } catch (err) {
    console.warn(`[Step 8] Failed to update WhatsApp status in Google Sheet:`, err.message);
  }
}

module.exports = {
  normalizePhoneNumber,
  buildWhatsAppPitch,
  sendWhatsAppPitch,
  updateWhatsAppSheetStatus
};
