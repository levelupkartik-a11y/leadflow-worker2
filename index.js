require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { researchBusiness } = require('./src/1-research');
const { generateCopy } = require('./src/2-copywriter');
const { selectTemplate } = require('./src/3-template-selector');
const { adaptLayout } = require('./src/4-layout-adapter');
const { processImages } = require('./src/5-image-pipeline');
const { deployToCloudflare } = require('./src/6-deploy');
const { reportBackToSheet } = require('./src/7-report');
const { sendWhatsAppPitch } = require('./src/8-whatsapp');

const { composioExecute, normalizePhoneNumber } = require('./src/utils');

/**
 * Deep-scan every string in the copy object and replace any LLM placeholder
 * tokens (e.g. "[Insert phone number]") with the real research-data value.
 * Prevents those tokens from ever making it into the final HTML.
 */
function sanitizeCopy(copy, researchData) {
  const phone   = researchData.phone   || '';
  const address = researchData.address || '';

  function replacePlaceholders(val) {
    if (typeof val !== 'string') return val;
    return val
      .replace(/\[Insert phone number\]/gi,  phone)
      .replace(/\[Insert address\]/gi,        address)
      .replace(/\[Insert email[^\]]*\]/gi,    '')
      .replace(/\[Insert[^\]]*\]/gi,          '');  // catch-all for any other token
  }

  function deepSanitize(obj) {
    if (typeof obj === 'string')  return replacePlaceholders(obj);
    if (Array.isArray(obj))       return obj.map(deepSanitize);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) out[k] = deepSanitize(v);
      return out;
    }
    return obj;
  }

  return deepSanitize(copy);
}

async function main() {
  const mapsUrl = process.argv[2];
  const rowId = process.argv[3];
  const sheetName = process.argv[4] || 'Sector 17 Chandigarh';

  if (!mapsUrl) {
    console.error('Usage: node index.js <MapsLink> [RowId] [SheetName]');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pre-check: Skip rows where the business already has a website, or has
  // no valid mobile phone listed in the sheet (cannot contact = cannot sell).
  // ─────────────────────────────────────────────────────────────────────────
  const SHEET1_NAME = 'Sector 17 Chandigarh';
  const isSheet1 = !sheetName || sheetName === SHEET1_NAME;

  if (rowId) {
    try {
      const check = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k',
        range: `${sheetName}!A${rowId}:G${rowId}`,
        value_render_option: 'FORMATTED_VALUE',
      });
      const rowVals = check?.data?.values?.[0] || [];
      const sheetPhone = rowVals[1]?.trim();
      const existingWebsite = rowVals[2]?.trim();

      // Check phone number from sheet
      if (sheetPhone) {
        const phoneCheck = normalizePhoneNumber(sheetPhone);
        if (!phoneCheck.valid) {
          console.log(`[Pre-check] Row ${rowId} phone "${sheetPhone}" is invalid: ${phoneCheck.reason}.`);
          console.log(`[Pre-check] Skipping site generation (cannot contact via WhatsApp).`);
          await reportBackToSheet(`SKIPPED: ${phoneCheck.reason}`, sheetName, rowId, 0, isSheet1);
          process.exit(0);
        }
      }

      // Check existing website from sheet
      if (!isSheet1 && existingWebsite && existingWebsite.startsWith('http')) {
        console.log(`[Pre-check] Row ${rowId} already has a website: ${existingWebsite}`);
        console.log(`[Pre-check] Skipping site generation for this row. "made websites" column left blank.`);
        process.exit(0);
      }
    } catch (e) {
      console.warn('[Pre-check] Could not read row details, proceeding with build.', e.message);
    }
  }

  let buildDir = null;
  let deploymentSucceeded = false;
  const cleanup = () => {
    if (deploymentSucceeded && buildDir && fs.existsSync(buildDir)) {
      console.log('[Cleanup] Cleaning up build directory...');
      try {
        fs.rmSync(buildDir, { recursive: true, force: true });
      } catch (e) {
        console.error('[Cleanup] Failed to delete build directory:', e.message);
      }
    } else if (buildDir && fs.existsSync(buildDir)) {
      console.log(`[Cleanup] Keeping local build directory '${buildDir}' for inspection due to failure or exit before deployment.`);
    }
  };

  // Register exit and signal handlers
  process.on('exit', cleanup);
  const handleSignal = (code) => {
    cleanup();
    process.exit(code);
  };
  process.on('SIGINT', () => handleSignal(130));
  process.on('SIGTERM', () => handleSignal(143));

  try {
    // Step 1: Research
    const researchData = await researchBusiness(mapsUrl, rowId, sheetName);

    // ── Mobile Phone Guard ──
    // If business has no valid mobile phone listed on Google Maps / sheet, abort immediately.
    const finalPhone = researchData.phone || '';
    const phoneCheck = normalizePhoneNumber(finalPhone);
    if (!phoneCheck.valid) {
      console.log(`[Phone Guard] Business "${researchData.title}" has no valid mobile phone listed (${finalPhone || 'EMPTY'} - ${phoneCheck.reason}).`);
      console.log(`[Phone Guard] Cannot contact via WhatsApp. Aborting build to save compute.`);
      if (rowId) {
        await reportBackToSheet(`SKIPPED: ${phoneCheck.reason}`, sheetName, rowId, 0, isSheet1);
      }
      process.exit(0);
    }

    // Step 2: Copywriting
    let copyData = await generateCopy(researchData);
    copyData = sanitizeCopy(copyData, researchData);  // strip any [Insert ...] LLM placeholders

    // Step 3: Template Selection
    const templateId = await selectTemplate(researchData, copyData);

    // Prepare unique build directory to avoid race conditions
    const buildDirName = `.build-${rowId || 'test'}-${Date.now()}`;
    buildDir = path.join(__dirname, buildDirName);
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir);

    const templatePath = path.join(__dirname, 'templates', templateId);
    fs.cpSync(templatePath, buildDir, { recursive: true });

    // Step 4: Adapt Layout
    await adaptLayout(templateId, copyData, buildDir, researchData);

    // Step 5: Image Pipeline
    await processImages(researchData, copyData, buildDir, templateId);

    // Step 5.5: Quality Check
    const { runQualityCheck } = require('./src/5.5-quality-check');
    const qaResult = await runQualityCheck(buildDir, researchData, copyData);

    let liveUrl = null;
    let reviewsCount = (researchData.reviews && Array.isArray(researchData.reviews)) ? researchData.reviews.length : 0;

    if (qaResult.success) {
      // Step 6: Deploy
      liveUrl = await deployToCloudflare(buildDir, researchData.title, rowId, sheetName);
      deploymentSucceeded = true;
      
      // Step 7: Report
      if (rowId) await reportBackToSheet(liveUrl, sheetName, rowId, reviewsCount, isSheet1);

      // Step 8: WhatsApp Outreach
      if (process.env.DISABLE_WHATSAPP !== 'true') {
        const phone = researchData.phone || '';
        await sendWhatsAppPitch(
          phone,
          researchData.title,
          liveUrl,
          researchData.rating || '',
          researchData.category || '',
          rowId,
          sheetName
        );
      } else {
        console.log('[Step 8] WhatsApp outreach skipped (DISABLE_WHATSAPP=true)');
      }
    } else {
      console.log(`[Step 6] Skipping deployment due to failed Quality Check.`);
      
      // Step 7: Report Failure
      const failureMessage = `NEEDS REVIEW: ${qaResult.failedReason}`;
      if (rowId) await reportBackToSheet(failureMessage, sheetName, rowId, reviewsCount, isSheet1);
    }

    // Step 9: Cleanup
    console.log('[Step 9] Cleaning up...');
    cleanup();
    process.off('exit', cleanup);

    console.log('Pipeline finished successfully!');
  } catch (err) {
    console.error('Pipeline failed:', err);
    cleanup();
    if (rowId) {
      try {
        console.log('[Error Handler] Attempting to report failure back to Google Sheet...');
        await reportBackToSheet(`NEEDS REVIEW: Pipeline failed - ${err.message}`, sheetName, rowId, 0, isSheet1);
      } catch (sheetErr) {
        console.error('[Error Handler] Failed to report error back to sheet:', sheetErr.message);
      }
    }
    process.exit(1);
  }
}

main();
