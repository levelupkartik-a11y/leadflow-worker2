const { composioExecute } = require('./utils');

const SPREADSHEET_ID = '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k';

// isSheet1: true  → write to K ("Generated Demo Website") — Sheet 1 layout
//           false → write to N ("created websites")         — Sheet 2+ layout
async function reportBackToSheet(liveUrl, sheetName, rowId, reviewsCount, isSheet1 = true) {
  console.log(`[Step 7] Reporting URL back to Google Sheet... row ${rowId}`);

  if (isSheet1) {
    // ──────────────────────────────────────────────────────────────────────
    // Sheet 1 — existing column layout: K=Generated Demo Website, L=Reviews, M=QA Status
    // ──────────────────────────────────────────────────────────────────────
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'K1', value_input_option: 'RAW',
      values: [['Generated Demo Website']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'L1', value_input_option: 'RAW',
      values: [['Number of Reviews']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'M1', value_input_option: 'RAW',
      values: [['QA Status']],
    });

    const isFailure = liveUrl.startsWith('NEEDS REVIEW');
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `K${rowId}`, value_input_option: 'RAW',
      values: [[isFailure ? '-' : liveUrl]],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `M${rowId}`, value_input_option: 'RAW',
      values: [[isFailure ? liveUrl : 'PASSED']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `L${rowId}`, value_input_option: 'RAW',
      values: [[reviewsCount || 0]],
    });

  } else {
    // ──────────────────────────────────────────────────────────────────────
    // Sheet 2+ column layout:
    //   I  = Website          (existing real site — NEVER written here)
    //   J  = Status
    //   K  = Date Added
    //   L  = Number of Reviews  (our output)
    //   M  = QA Status          (our output)
    //   N  = created websites   (our generated URL — written here only)
    // ──────────────────────────────────────────────────────────────────────

    // Ensure output column headers exist
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'L1', value_input_option: 'RAW',
      values: [['Number of Reviews']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'M1', value_input_option: 'RAW',
      values: [['QA Status']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: 'N1', value_input_option: 'RAW',
      values: [['created websites']],
    });

    const isFailure = liveUrl.startsWith('NEEDS REVIEW');

    // Write generated URL to N ("created websites") — never to I ("Website")
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `N${rowId}`, value_input_option: 'RAW',
      values: [[isFailure ? '-' : liveUrl]],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `M${rowId}`, value_input_option: 'RAW',
      values: [[isFailure ? liveUrl : 'PASSED']],
    });
    await composioExecute('GOOGLESHEETS_BATCH_UPDATE', {
      spreadsheet_id: SPREADSHEET_ID, sheet_name: sheetName,
      first_cell_location: `L${rowId}`, value_input_option: 'RAW',
      values: [[reviewsCount || 0]],
    });
  }

  console.log(`[Step 7] Reported successfully to Sheet!`);
}

module.exports = { reportBackToSheet };
