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

async function main() {
  const mapsUrl = process.argv[2];
  const rowId = process.argv[3];
  const sheetName = process.argv[4] || 'Sector 17 Chandigarh';

  if (!mapsUrl) {
    console.error('Usage: node index.js <MapsLink> [RowId] [SheetName]');
    process.exit(1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sheet 2+ pre-check: skip rows where the business already has a website.
  //
  // Sheet 1 ("Sector 17 Chandigarh") is pre-filtered — no website column
  // exists there, so we always build. For every other sheet the raw
  // Google-scraped site URL lives in column I ("Website"). If it's
  // populated we skip site generation for this row entirely.
  // ─────────────────────────────────────────────────────────────────────────
  const SHEET1_NAME = 'Sector 17 Chandigarh';
  const isSheet1 = !sheetName || sheetName === SHEET1_NAME;

  if (!isSheet1 && rowId) {
    const { composioExecute } = require('./src/utils');
    try {
      const check = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k',
        range: `${sheetName}!C${rowId}:C${rowId}`,
        value_render_option: 'FORMATTED_VALUE',
      });
      const existingWebsite = check?.data?.values?.[0]?.[0]?.trim();
      if (existingWebsite) {
        console.log(`[Pre-check] Row ${rowId} already has a website: ${existingWebsite}`);
        console.log(`[Pre-check] Skipping site generation for this row. "made websites" column left blank.`);
        process.exit(0);
      } else {
        console.log(`[Pre-check] Row ${rowId} has no existing website — proceeding with build.`);
      }
    } catch (e) {
      console.warn('[Pre-check] Could not read website column, proceeding with build.', e.message);
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

    // Step 2: Copywriting
    const copyData = await generateCopy(researchData);

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
    } else {
      console.log(`[Step 6] Skipping deployment due to failed Quality Check.`);
      
      // Step 7: Report Failure
      const failureMessage = `NEEDS REVIEW: ${qaResult.failedReason}`;
      if (rowId) await reportBackToSheet(failureMessage, sheetName, rowId, reviewsCount, isSheet1);
    }

    // Step 8: Cleanup
    console.log('[Step 8] Cleaning up...');
    cleanup();
    process.off('exit', cleanup);

    console.log('Pipeline finished successfully!');
  } catch (err) {
    console.error('Pipeline failed:', err);
    cleanup();
    process.exit(1);
  }
}

main();
