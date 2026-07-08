const { composioExecute } = require('./utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';

async function reportBackToSheet(liveUrl, sheetName, rowId, reviewsCount) {
  console.log(`[Step 7] Reporting URL back to Google Sheet... row ${rowId}`);
  
  // First, ensure the header is set for the K and L columns
  await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: sheetName,
    first_cell_location: 'K1',
    value_input_option: 'RAW',
    values: [['Generated Demo Website']],
  });

  await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: sheetName,
    first_cell_location: 'L1',
    value_input_option: 'RAW',
    values: [['Number of Reviews']],
  });

  // Then write the URL to the specific row
  await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: sheetName,
    first_cell_location: `K${rowId}`,
    value_input_option: 'RAW',
    values: [[liveUrl]],
  });

  // Write reviews count to the specific row
  await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
    spreadsheet_id: SPREADSHEET_ID,
    sheet_name: sheetName,
    first_cell_location: `L${rowId}`,
    value_input_option: 'RAW',
    values: [[reviewsCount || 0]],
  });

  console.log(`[Step 7] Reported successfully to Sheet!`);
}

module.exports = { reportBackToSheet };
