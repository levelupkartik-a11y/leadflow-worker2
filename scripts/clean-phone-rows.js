require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { composioExecute, normalizePhoneNumber } = require('../src/utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';

async function cleanSheetPhoneRows(sheetName) {
  console.log(`\n========================================`);
  console.log(`Cleaning no-phone listings from "${sheetName}"...`);
  console.log(`========================================`);

  // 1. Fetch current rows
  const valRes = await composioExecute('GOOGLESHEETS_VALUES_GET', {
    spreadsheet_id: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:N1000`,
    value_render_option: 'FORMATTED_VALUE'
  });

  const allRows = valRes?.data?.values || [];
  if (allRows.length <= 1) {
    console.log(`[Clean] No data rows found in "${sheetName}".`);
    return;
  }

  // Backup to disk
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `${sheetName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(allRows, null, 2), 'utf8');
  console.log(`[Backup] Saved ${allRows.length} rows to ${backupFile}`);

  const header = allRows[0];
  const headersLower = header.map(h => (h || '').trim().toLowerCase());
  const phoneIdx = headersLower.findIndex(h => h.includes('phone'));
  const genSiteIdx = headersLower.findIndex(h => h.includes('generated demo') || h.includes('made websites'));

  const cleanDataRows = [];
  let removedCount = 0;

  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const name = row[0]?.trim();
    if (!name) continue;

    const rawPhone = (phoneIdx !== -1 ? row[phoneIdx] : row[1])?.trim() || '';
    const phoneInfo = normalizePhoneNumber(rawPhone);

    const fallbackGenCol = sheetName === 'Sector 17 Chandigarh' ? 10 : 13;
    const genWebsite = (genSiteIdx !== -1 ? row[genSiteIdx] : row[fallbackGenCol])?.trim() || '';
    const hasBuiltWebsite = genWebsite.startsWith('http');

    // If phone is invalid AND no website has been built, drop this row
    if (!phoneInfo.valid && !hasBuiltWebsite) {
      removedCount++;
      continue;
    }

    cleanDataRows.push(row);
  }

  console.log(`[Clean] Original data rows: ${allRows.length - 1}`);
  console.log(`[Clean] Removed rows (no valid mobile phone): ${removedCount}`);
  console.log(`[Clean] Retained valid rows: ${cleanDataRows.length}`);

  if (removedCount === 0) {
    console.log(`[Clean] Sheet "${sheetName}" is already clean. No changes needed.`);
    return;
  }

  // 2. Clear old range (A2:N1000)
  console.log(`[Clean] Clearing previous range '${sheetName}'!A2:N1000...`);
  await composioExecute('GOOGLESHEETS_CLEAR_VALUES', {
    spreadsheet_id: SPREADSHEET_ID,
    range: `'${sheetName}'!A2:N1000`
  });

  // 3. Write back cleaned data rows starting at A2
  console.log(`[Clean] Writing back ${cleanDataRows.length} clean rows to '${sheetName}'...`);
  await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: sheetName,
    first_cell_location: 'A2',
    value_input_option: 'RAW',
    values: cleanDataRows
  });

  console.log(`[Clean] Sheet "${sheetName}" successfully updated!`);
}

async function main() {
  const targetSheet = process.argv[2];
  if (targetSheet) {
    await cleanSheetPhoneRows(targetSheet);
    return;
  }

  const metaRes = await composioExecute('GOOGLESHEETS_GET_SHEET_NAMES', {
    spreadsheet_id: SPREADSHEET_ID
  });
  const sheets = metaRes.data?.sheet_names || metaRes.data?.sheets || [];
  const skipSheets = ['Sheet1', 'Config'];

  for (const sheet of sheets) {
    if (skipSheets.includes(sheet)) continue;
    await cleanSheetPhoneRows(sheet);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n[Clean] All sheets cleaned successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanSheetPhoneRows };
