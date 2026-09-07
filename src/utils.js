async function composioExecute(actionSlug, args = {}) {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is missing');
  
  const url = `https://backend.composio.dev/api/v3.1/tools/execute/${actionSlug}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout covers fetch + body read

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ entity_id: 'one', arguments: args }),
      signal: controller.signal,
    });
    
    // NOTE: Do NOT clear the timeout here - keep it active to cover res.json() body streaming too
    const json = await res.json();
    clearTimeout(timeoutId); // Only clear AFTER full body is read
    
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${actionSlug}: ${JSON.stringify(json)}`);
    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Composio request timed out after 45s on ${actionSlug}`);
    }
    throw err;
  }
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/**
 * Normalizes phone numbers to standard international format (E.164 without leading plus for some APIs, or with +).
 * Returns { valid: boolean, formatted: string, digitsOnly: string, isLandline: boolean, reason?: string }
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { valid: false, formatted: '', isLandline: false, reason: 'No phone number provided' };
  }

  // Remove whitespace, dashes, parens, dots
  let cleaned = rawPhone.replace(/[\s\-\(\)\.]/g, '').trim();
  let digits = cleaned.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, formatted: '', isLandline: false, reason: 'No numeric digits found in phone number' };
  }

  // Detect Indian landline area codes (e.g. 0172 for Chandigarh / Panchkula / Mohali, 011 for Delhi, etc.)
  // Landlines typically start with 01.. or +911.. and are not 10-digit mobile (which start with 6, 7, 8, 9)
  if (
    digits.startsWith('91172') || 
    digits.startsWith('0172') || 
    (digits.startsWith('172') && digits.length <= 10) ||
    digits.startsWith('9111') ||
    digits.startsWith('011') ||
    (digits.length <= 11 && (digits.startsWith('01') || digits.startsWith('911')))
  ) {
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
  } else {
    // Does not match standard Indian mobile format
    return { valid: false, formatted: cleaned, isLandline: false, reason: 'Phone number does not match mobile number format (must start with 6-9)' };
  }

  return {
    valid: true,
    formatted: `+${digits}`,
    digitsOnly: digits,
    isLandline: false
  };
}

module.exports = { composioExecute, withTimeout, normalizePhoneNumber };
