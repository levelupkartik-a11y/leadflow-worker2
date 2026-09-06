require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { researchBusiness } = require('./src/1-research');
const { generateCopy } = require('./src/2-copywriter');
const { selectTemplate } = require('./src/3-template-selector');
const { adaptLayout } = require('./src/4-layout-adapter');
const { processImages } = require('./src/5-image-pipeline');

async function testPipeline(name, type) {
  console.log(`\n\n==== TESTING: ${name} (${type}) ====`);
  try {
    // Mock research data
    const researchData = {
      name: name,
      type: type,
      phone: '123-456-7890',
      address: '123 Main St, Chandigarh',
      operating_hours: '9 AM - 6 PM',
      attributes: ['Quality', 'Service', 'Reliability'],
      reviews: [
         { text: 'Great place!', reviewer: 'Alice' },
         { text: 'Loved it!', reviewer: 'Bob' },
         { text: 'Highly recommend.', reviewer: 'Charlie' }
      ]
    };

    // Step 2: Copywriting
    console.log('Generating Copy...');
    const copyData = await generateCopy(researchData);

    // Step 3: Template Selection
    const templateId = await selectTemplate(researchData, copyData);

    // Prepare build directory
    const buildDir = path.join(__dirname, `.build-${templateId}`);
    if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
    fs.mkdirSync(buildDir);

    const templatePath = path.join(__dirname, 'templates', templateId);
    fs.cpSync(templatePath, buildDir, { recursive: true });

    // Step 4: Adapt Layout
    await adaptLayout(templateId, copyData, buildDir, researchData);

    // Skip Image pipeline since it takes 15 seconds
    // await processImages(researchData, copyData, buildDir);
    
    console.log(`✅ Success for ${name}. Output built to ${buildDir}`);
  } catch (err) {
    console.error(`❌ Failed ${name}:`, err);
  }
}

async function runTests() {
  await testPipeline('Apollo Clinic', 'healthcare, dental clinic');
  await testPipeline('Toni & Guy', 'beauty salon, spa');
  await testPipeline('Omaxe Properties', 'real estate, builders');
  await testPipeline('A1 Hardware Store', 'hardware store, general');
}

runTests();
