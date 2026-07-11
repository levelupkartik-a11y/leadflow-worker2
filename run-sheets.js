require('dotenv').config();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { composioExecute } = require('./src/utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';
const CONCURRENCY_LIMIT = 2; // Safe limit to prevent Groq/Gemini/Cloudflare API exhaustion

// Run a list of commands with a max concurrency limit
async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const p = execPromise(task.command)
      .then((res) => {
        console.log(`[SUCCESS] Sheet: "${task.sheet}", Row ${task.row}: ${task.name}`);
        return { task, success: true, stdout: res.stdout };
      })
      .catch((err) => {
        console.error(`[FAILED] Sheet: "${task.sheet}", Row ${task.row}: ${task.name} - ${err.message}`);
        return { task, success: false, error: err };
      });
      
    results.push(p);
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
    
    // Add an artificial delay between task starts to stagger API bursts
    await new Promise(r => setTimeout(r, 5000));
  }
  
  return Promise.all(results);
}

async function main() {
  console.log('Starting Batch Sheet Runner...');
  
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
      console.log(`\n========================================`);
      console.log(`PROCESSING SHEET: "${sheetName}"`);
      console.log(`========================================`);
      
      // 2. Fetch rows (cols A to N) to inspect which rows need websites built.
      // Column A: Business Title
      // Column D: Maps URL (or Query)
      // Column I: Scraped website (if present, we skip)
      // Column K: Created website (for Sheet 1)
      // Column N: Created website (for Sheet 2+)
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
        
        // Skip if it already has a raw scraped website in column I
        const scrapedWebsite = row[8]?.trim();
        if (scrapedWebsite) {
          console.log(`[Skip] Row ${rowId}: "${name}" already has website in column I (Scraped: ${scrapedWebsite})`);
          return;
        }
        
        // Skip if it already has a generated website
        const generatedWebsite = isSheet1 ? row[10]?.trim() : row[13]?.trim();
        if (generatedWebsite && generatedWebsite.startsWith('http')) {
          console.log(`[Skip] Row ${rowId}: "${name}" already has generated website (Col ${isSheet1 ? 'K' : 'N'}: ${generatedWebsite})`);
          return;
        }
        
        // Build maps link query - if it's already a full maps URL, use it; otherwise create a query link
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
      
      console.log(`[Runner] Found ${tasks.length} rows to build in "${sheetName}". Starting batch run...`);
      const results = await runWithConcurrencyLimit(tasks, CONCURRENCY_LIMIT);
      
      const successful = results.filter(r => r.success).length;
      console.log(`\n[Runner] Sheet "${sheetName}" complete! Successfully built ${successful}/${tasks.length} websites.`);
    }
    
    console.log('\n========================================');
    console.log('ALL TARGET SHEETS FULLY PROCESSED! 🎉');
    console.log('========================================');
    
  } catch (err) {
    console.error('Fatal runner error:', err.message);
  }
}

main();
