require('dotenv').config();
const { composioExecute } = require('./src/utils');
const { normalizePhoneNumber, sendWhatsAppPitch } = require('./src/8-whatsapp');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';

// Helper: Sleep with jitter
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const isTestFlag = args.includes('--test');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const maxLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : (process.env.MAX_OUTREACH_PER_RUN ? parseInt(process.env.MAX_OUTREACH_PER_RUN, 10) : 10);

  // If --test flag or TEST_OUTREACH_PHONE is set in env
  const testPhone = isTestFlag ? (process.env.TEST_OUTREACH_PHONE || '8264922342') : process.env.TEST_OUTREACH_PHONE;
  if (testPhone) {
    process.env.TEST_OUTREACH_PHONE = testPhone;
    console.log(`\n======================================================`);
    console.log(`🛡️ SAFE TEST MODE ACTIVE: All pitches divert to ${testPhone}`);
    console.log(`   (No actual leads will be messaged during this run)`);
    console.log(`======================================================\n`);
  }

  console.log('[Outreach Worker] Fetching all sheet names...');
  let sheetNames = [];
  try {
    const sheetsRes = await composioExecute('GOOGLESHEETS_GET_SHEET_NAMES', {
      spreadsheet_id: SPREADSHEET_ID
    });
    const rawNames = sheetsRes?.data?.sheet_names || [];
    sheetNames = rawNames.filter(n => n !== 'Config');
    console.log(`[Outreach Worker] Found ${sheetNames.length} sheet(s) to scan:`, sheetNames);
  } catch (e) {
    console.warn('[Outreach Worker] Failed to list sheet names, falling back to defaults:', e.message);
    sheetNames = ['Sector 17 Chandigarh', 'Chandigarh'];
  }

  let totalDispatched = 0;

  for (const sheetName of sheetNames) {
    if (totalDispatched >= maxLimit) {
      console.log(`[Outreach Worker] Reached run limit (${maxLimit} messages). Stopping.`);
      break;
    }

    console.log(`\n========================================`);
    console.log(`📋 Scanning Sheet: "${sheetName}"`);
    console.log(`========================================`);

    const isSheet1 = sheetName === 'Sector 17 Chandigarh';
    const range = `'${sheetName}'!A2:O500`;

    let rows = [];
    try {
      const valRes = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: SPREADSHEET_ID,
        range: range,
        value_render_option: 'FORMATTED_VALUE'
      });
      rows = valRes?.data?.values || [];
    } catch (e) {
      console.error(`[Outreach Worker] Failed to read sheet "${sheetName}":`, e.message);
      continue;
    }

    if (rows.length === 0) {
      console.log(`[Outreach Worker] No rows found in "${sheetName}".`);
      continue;
    }

    for (let index = 0; index < rows.length; index++) {
      if (totalDispatched >= maxLimit) break;

      const row = rows[index];
      const rowId = index + 2; // Row 2 onwards

      const businessName = row[0]?.trim();
      const rawPhone = row[1]?.trim();
      const category = row[4]?.trim() || '';
      const rating = row[5]?.trim() || '';
      
      // Column N (index 13) is "made websites"
      const generatedWebsite = isSheet1 ? row[10]?.trim() : row[13]?.trim();
      // Column O (index 14) is "WhatsApp Status"
      const whatsappStatus = isSheet1 ? row[13]?.trim() : row[14]?.trim();

      // Check criteria:
      // 1. Must have a generated website
      if (!generatedWebsite || !generatedWebsite.startsWith('http')) {
        continue;
      }

      // 2. Must not already have a recorded WhatsApp status (e.g. SENT, SKIPPED)
      if (whatsappStatus && (whatsappStatus === 'SENT' || whatsappStatus.startsWith('SKIPPED') || whatsappStatus.startsWith('FAILED'))) {
        continue;
      }

      // 3. Must have a phone number
      if (!rawPhone) {
        console.log(`[Skip] Row ${rowId} ("${businessName}"): No phone number provided.`);
        continue;
      }

      console.log(`\n[Lead Match] Row ${rowId}: "${businessName}"`);
      console.log(`  - Target Phone: ${rawPhone}`);
      console.log(`  - Pitch URL: ${generatedWebsite}`);
      console.log(`  - Rating: ${rating}★ | Category: ${category}`);

      // Dispatch pitch
      const result = await sendWhatsAppPitch(
        rawPhone,
        businessName,
        generatedWebsite,
        rating,
        category,
        rowId,
        sheetName,
        'website'
      );

      if (result.success) {
        totalDispatched++;
        console.log(`✅ Dispatched (${totalDispatched}/${maxLimit})`);

        // Add human-like jitter delay between 15s and 30s to prevent spam detection
        if (totalDispatched < maxLimit) {
          const delaySec = Math.floor(Math.random() * 15) + 15;
          console.log(`⏳ Pacing pause: Waiting ${delaySec}s before next message...`);
          await sleep(delaySec * 1000);
        }
      } else {
        console.log(`⚠️ Dispatch skipped/failed for "${businessName}":`, result.reason || result.error);
      }
    }
  }

  console.log('\n========================================');
  console.log(`🎉 OUTREACH RUN COMPLETE! Total sent: ${totalDispatched}`);
  console.log('========================================');
}

main().catch(console.error);
