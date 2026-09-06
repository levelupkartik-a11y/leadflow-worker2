require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { runQualityCheck } = require('./src/5.5-quality-check');

async function testDeliberateFailure() {
  console.log('--- Deliberate Failure Test ---');
  
  const buildDir = path.join(__dirname, '.build-test-fail');
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

  // Provide HTML that is missing the phone number and has a placeholder
  fs.writeFileSync(path.join(buildDir, 'index.html'), `
    <html>
      <body>
        <h1>Awesome Clinic</h1>
        <p>Best dental care</p>
        <p>123 Fake St.</p>
        <!-- Missing phone! -->
        <p>{BusinessName} is great.</p>
      </body>
    </html>
  `);

  const assetsDir = path.join(buildDir, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir);
  
  // Make a dummy valid image so the image check passes or gets evaluated
  // We'll write a 1x1 pixel JPEG
  const base64Img = '/9j/4AAQSkZJRgABAQEAAAAAAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  fs.writeFileSync(path.join(assetsDir, 'img-1.jpg'), Buffer.from(base64Img, 'base64'));

  const researchData = {
    category: 'Dental Clinic',
    phone: '555-0101', // This is missing from the HTML
    address: '123 Fake St.'
  };

  const copyData = {
    headline: 'Awesome Clinic',
    about_section: 'Best dental care'
  };

  const result = await runQualityCheck(buildDir, researchData, copyData);
  console.log('Test Result:', result);
}

testDeliberateFailure();
