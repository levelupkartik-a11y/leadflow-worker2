require('dotenv').config();
process.env.DISABLE_WHATSAPP = 'true'; // Enforce zero outreach during website build batches
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const { composioExecute, normalizePhoneNumber } = require('./src/utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';
const CONCURRENCY_LIMIT = 1; // Set to 1 to prevent concurrent threads from congesting the Gemini API (causing 429 failures)

// Run a list of commands with limits checks, allowing active tasks to finish before stopping
async function runWithLimitChecks(tasks, limit, startTime, maxDurationMs, maxBuilds) {
  let buildsCount = 0;
  const executing = [];
  
  for (const task of tasks) {
    // Check limit conditions before starting any new website build task
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDurationMs) {
      console.log(`\n[Limit Check] Time limit reached (${Math.round(elapsed / 60000)} minutes elapsed). Stopping new tasks queue...`);
      break;
    }
    if (buildsCount >= maxBuilds) {
      console.log(`\n[Limit Check] Batch limit of ${maxBuilds} builds reached. Stopping new tasks queue...`);
      break;
    }
    
    console.log(`[Runner] Starting Row ${task.row}: ${task.name}...`);
    const p = execPromise(task.command)
      .then((res) => {
        console.log(`[SUCCESS] Sheet: "${task.sheet}", Row ${task.row}: ${task.name}`);
        return { success: true };
      })
      .catch((err) => {
        console.error(`[FAILED] Sheet: "${task.sheet}", Row ${task.row}: ${task.name} - ${err.message}`);
        return { success: false };
      });
      
    executing.push(p);
    buildsCount++;
    
    // Remove completed promises from the executing array
    p.then(() => executing.splice(executing.indexOf(p), 1));
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
    
    // Add artificial delay between task starts to stagger API bursts
    await new Promise(r => setTimeout(r, 5000));
  }
  
  // Wait for all currently running active tasks to finish completely
  if (executing.length > 0) {
    console.log(`[Runner] Waiting for ${executing.length} active builds to finish...`);
    await Promise.all(executing);
  }
  
  return buildsCount;
}

async function main() {
  console.log('Starting Batch Sheet Runner...');
  
  const startTime = Date.now();
  const maxBuilds = parseInt(process.env.MAX_BUILDS_PER_DAY || '100', 10);
  const maxDurationMinutes = parseInt(process.env.MAX_RUN_TIME_MINUTES || '330', 10); // 5.5 hours default to prevent GitHub Action 6-hour force kills
  const maxDurationMs = maxDurationMinutes * 60 * 1000;
  
  console.log(`[Runner] Settings: MAX_BUILDS_PER_DAY=${maxBuilds}, MAX_RUN_TIME_MINUTES=${maxDurationMinutes}`);
  
  let totalBuildsCompleted = 0;
  
  try {
    // 1. Fetch all sheet names in the spreadsheet
    console.log('[Runner] Fetching sheet names from spreadsheet...');
    const metaRes = await composioExecute('GOOGLESHEETS_GET_SHEET_NAMES', {
      spreadsheet_id: SPREADSHEET_ID
    });
    
    const sheets = metaRes.data?.sheet_names || metaRes.data?.sheets || [];
    const skipSheets = ['Sheet1', 'Config'];
    const targetSheets = sheets.filter(name => !skipSheets.includes(name));
    
    console.log(`[Runner] Found sheets to process: ${targetSheets.join(', ')}`);
    
    for (const sheetName of targetSheets) {
      const elapsed = Date.now() - startTime;
      if (elapsed > maxDurationMs) {
        console.log(`\n[Runner] Time limit reached before starting sheet "${sheetName}". Exiting.`);
        break;
      }
      const remainingBuilds = maxBuilds - totalBuildsCompleted;
      if (remainingBuilds <= 0) {
        console.log(`\n[Runner] Global daily build cap of ${maxBuilds} reached before starting sheet "${sheetName}". Exiting.`);
        break;
      }
      
      console.log(`\n========================================`);
      console.log(`PROCESSING SHEET: "${sheetName}"`);
      console.log(`========================================`);
      
      // 2. Fetch rows including headers (Range A1:N1000)
      console.log(`[Runner] Fetching row values from "${sheetName}" (Range A1:N1000)...`);
      const valRes = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: SPREADSHEET_ID,
        range: `'${sheetName}'!A1:N1000`,
        value_render_option: 'FORMATTED_VALUE'
      });
      
      const allRows = valRes?.data?.values || [];
      if (allRows.length <= 1) {
        console.log(`[Runner] No data rows found in sheet "${sheetName}". Moving to next sheet.`);
        continue;
      }

      const headers = allRows[0].map(h => (h || '').trim().toLowerCase());
      const dataRows = allRows.slice(1);
      
      const isSheet1 = sheetName === 'Sector 17 Chandigarh';

      // Dynamic column identification
      const phoneColIdx = headers.findIndex(h => h.includes('phone'));
      const websiteColIdx = headers.findIndex(h => h === 'website');
      const mapsUrlColIdx = headers.findIndex(h => h.includes('maps url') || h.includes('google maps'));
      const addressColIdx = headers.findIndex(h => h.includes('address'));
      const generatedSiteColIdx = headers.findIndex(h => h.includes('generated demo') || h.includes('made websites'));

      const tasks = [];
      
      dataRows.forEach((row, index) => {
        const rowId = index + 2; // 1-indexed, starting after header row (row 2)
        const name = row[0]?.trim();
        
        if (!name) {
          return; // Skip empty rows
        }

        // ── 1. Phone number pre-filter: Skip businesses without a valid mobile phone ──
        const rawPhone = (phoneColIdx !== -1 ? row[phoneColIdx] : row[1])?.trim() || '';
        const phoneInfo = normalizePhoneNumber(rawPhone);
        if (!phoneInfo.valid) {
          console.log(`[Skip] Row ${rowId}: "${name}" has no valid mobile phone (${rawPhone || 'EMPTY'} - ${phoneInfo.reason}) — cannot contact via WhatsApp.`);
          return;
        }
        
        // ── 2. Official website & Service check: Skip if business already has a site or service != website ──
        if (websiteColIdx !== -1) {
          const scrapedWebsite = row[websiteColIdx]?.trim();
          if (scrapedWebsite && scrapedWebsite.startsWith('http')) {
            console.log(`[Skip] Row ${rowId}: "${name}" already has an official website (${scrapedWebsite})`);
            return;
          }
        }

        const serviceColIdx = headers.findIndex(h => h.includes('service') || h.includes('pitch type'));
        if (serviceColIdx !== -1) {
          const service = (row[serviceColIdx] || '').trim().toLowerCase();
          if (service && !service.includes('website')) {
            console.log(`[Skip] Row ${rowId}: "${name}" has service "${service}" (not website).`);
            return;
          }
        }
        
        // ── 3. Generated website check: Rebuild if failed (NEEDS REVIEW / FAILED / -), skip only if already PASSED ──
        const fallbackGeneratedCol = isSheet1 ? 10 : 13;
        const generatedWebsite = (generatedSiteColIdx !== -1 ? row[generatedSiteColIdx] : row[fallbackGeneratedCol])?.trim() || '';
        const qaColIdx = headers.findIndex(h => h.includes('qa status'));
        const qaStatus = (qaColIdx !== -1 ? row[qaColIdx] : (isSheet1 ? row[12] : row[12]))?.trim() || '';
        const isFailed = qaStatus.includes('NEEDS REVIEW') || qaStatus.includes('FAILED') || generatedWebsite === '-';

        // Check if the site is actually built on disk in pitches/ (prevent skipping phantom 404 links)
        const siteSlug = generatedWebsite && generatedWebsite.startsWith('http') ? generatedWebsite.split('/').filter(Boolean).pop() : '';
        const existsOnDisk = Boolean(siteSlug && fs.existsSync(path.join(__dirname, 'pitches', siteSlug, 'index.html')));

        if (!isFailed && generatedWebsite && generatedWebsite.startsWith('http') && existsOnDisk) {
          console.log(`[Skip] Row ${rowId}: "${name}" already has verified live website (${generatedWebsite})`);
          return;
        }

        if (generatedWebsite && generatedWebsite.startsWith('http') && !existsOnDisk) {
          console.log(`[Rebuild] Row ${rowId}: "${name}" has URL in sheet (${generatedWebsite}) but files are missing on disk/Cloudflare (404 phantom link). Queueing for rebuild.`);
        } else if (isFailed) {
          console.log(`[Rebuild] Row ${rowId}: "${name}" previously failed (${qaStatus || '-'}). Queueing for rebuild.`);
        }
        
        // ── 4. Build reliable Maps URL query ──
        let mapsLink = (mapsUrlColIdx !== -1 && row[mapsUrlColIdx]) ? row[mapsUrlColIdx].trim() : '';
        if (!mapsLink && addressColIdx !== -1 && row[addressColIdx]) {
          mapsLink = row[addressColIdx].trim();
        }
        if (!mapsLink) {
          mapsLink = `${name} ${sheetName}`;
        }
        
        let queryUrl = mapsLink;
        if (!mapsLink.startsWith('http')) {
          queryUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsLink)}`;
        }
        
        tasks.push({
          row: rowId,
          name: name,
          sheet: sheetName,
          command: `node index.js "${queryUrl}" ${rowId} "${sheetName}"`
        });
      });
      
      if (tasks.length === 0) {
        console.log(`[Runner] All eligible rows in sheet "${sheetName}" are already processed or skipped (no valid mobile phones). Moving to next sheet.`);
        continue;
      }
      
      console.log(`[Runner] Found ${tasks.length} eligible rows to build in "${sheetName}". Starting run...`);
      const buildsThisSheet = await runWithLimitChecks(tasks, CONCURRENCY_LIMIT, startTime, maxDurationMs, remainingBuilds);
      totalBuildsCompleted += buildsThisSheet;
      
      console.log(`\n[Runner] Sheet "${sheetName}" complete! Built ${buildsThisSheet} websites in this sheet.`);
    }
    
    console.log('\n========================================');
    console.log(`ALL PROCESSABLE SHEETS FULLY PROCESSED! Built ${totalBuildsCompleted} websites total. 🎉`);
    console.log('========================================');
    
  } catch (err) {
    console.error('Fatal runner error:', err.message);
  }
}

main();
