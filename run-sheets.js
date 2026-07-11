require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { composioExecute } = require('./src/utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';
const CONCURRENCY_LIMIT = 2; // Safe limit to prevent Groq/Gemini/Cloudflare API exhaustion

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
      
      // 2. Fetch rows (cols A to N) to inspect which rows need websites built.
      console.log(`[Runner] Fetching row values from "${sheetName}" (Range A2:N150)...`);
      const valRes = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: SPREADSHEET_ID,
        range: `'${sheetName}'!A2:N150`,
        value_render_option: 'FORMATTED_VALUE'
      });
      
      const rows = valRes?.data?.values || [];
      if (rows.length === 0) {
        console.log(`[Runner] No rows found in sheet "${sheetName}". Moving to next sheet.`);
        continue;
      }
      
      const isSheet1 = sheetName === 'Sector 17 Chandigarh';
      const tasks = [];
      
      rows.forEach((row, index) => {
        const rowId = index + 2; // 1-indexed, starting after header row (row 2)
        const name = row[0]?.trim();
        const mapsLink = row[3]?.trim();
        
        if (!name || !mapsLink) {
          return; // Skip empty rows
        }
        
        // Skip if it already has a raw scraped website in column I (only applicable for Sheet 2+)
        if (!isSheet1) {
          const scrapedWebsite = row[8]?.trim();
          if (scrapedWebsite) {
            console.log(`[Skip] Row ${rowId}: "${name}" already has website in column I (Scraped: ${scrapedWebsite})`);
            return;
          }
        }
        
        // Skip if it already has a generated website
        const generatedWebsite = isSheet1 ? row[10]?.trim() : row[13]?.trim();
        if (generatedWebsite && generatedWebsite.startsWith('http')) {
          console.log(`[Skip] Row ${rowId}: "${name}" already has generated website (Col ${isSheet1 ? 'K' : 'N'}: ${generatedWebsite})`);
          return;
        }
        
        // Build maps link query
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
        console.log(`[Runner] All rows in sheet "${sheetName}" are already processed. Moving to next sheet.`);
        continue;
      }
      
      console.log(`[Runner] Found ${tasks.length} rows to build in "${sheetName}". Starting run...`);
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
