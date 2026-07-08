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

  if (!mapsUrl || !rowId) {
    console.error('Usage: node index.js <MapsLink> <RowId> [SheetName]');
    process.exit(1);
  }

  try {
    // Step 1: Research
    const researchData = await researchBusiness(mapsUrl, rowId, sheetName);

    // Step 2: Copywriting
    const copyData = await generateCopy(researchData);

    // Step 3: Template Selection
    const templateId = await selectTemplate(researchData, copyData);

    // Prepare build directory
    const buildDir = path.join(__dirname, '.build');
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir);

    const templatePath = path.join(__dirname, 'templates', templateId);
    fs.cpSync(templatePath, buildDir, { recursive: true });

    // Step 4: Adapt Layout
    await adaptLayout(templateId, copyData, buildDir);

    // Step 5: Image Pipeline
    await processImages(researchData, copyData, buildDir);

    // Step 6: Deploy
    const businessId = Math.random().toString(36).substring(2, 7);
    const liveUrl = await deployToCloudflare(buildDir, researchData.title, businessId);

    // Step 7: Report
    await reportBackToSheet(liveUrl, sheetName, rowId);

    // Step 8: Cleanup
    console.log('[Step 9] Cleaning up...');
    fs.rmSync(buildDir, { recursive: true, force: true });

    console.log('Pipeline finished successfully!');
  } catch (err) {
    console.error('Pipeline failed:', err);
    process.exit(1);
  }
}

main();
