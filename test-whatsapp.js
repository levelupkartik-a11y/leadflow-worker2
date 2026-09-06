require('dotenv').config();
const { normalizePhoneNumber, buildWhatsAppPitch, sendWhatsAppPitch } = require('./src/8-whatsapp');

async function runTests() {
  console.log('========================================');
  console.log('🧪 RUNNING WHATSAPP OUTREACH MODULE TESTS');
  console.log('========================================\n');

  // Test 1: Phone Normalization Tests
  console.log('--- TEST 1: Phone Normalization ---');
  const testCases = [
    { input: '+91 98887 88802', expectedValid: true, expectedDigits: '919888788802' },
    { input: '9888788802', expectedValid: true, expectedDigits: '919888788802' },
    { input: '09888788802', expectedValid: true, expectedDigits: '919888788802' },
    { input: '+91 172 260 7728', expectedValid: false, isLandline: true },
    { input: '1722607728', expectedValid: false, isLandline: true },
    { input: '12345', expectedValid: false },
    { input: '', expectedValid: false }
  ];

  let normPassCount = 0;
  for (const tc of testCases) {
    const res = normalizePhoneNumber(tc.input);
    const isValid = res.valid === tc.expectedValid;
    const isDigitsMatch = !tc.expectedDigits || res.digitsOnly === tc.expectedDigits;
    const isLandlineMatch = tc.isLandline === undefined || res.isLandline === tc.isLandline;

    if (isValid && isDigitsMatch && isLandlineMatch) {
      console.log(`✅ Passed for input: "${tc.input}" -> ${JSON.stringify(res)}`);
      normPassCount++;
    } else {
      console.error(`❌ Failed for input: "${tc.input}" -> Got: ${JSON.stringify(res)}, Expected: ${JSON.stringify(tc)}`);
    }
  }

  console.log(`\nPhone Normalization: ${normPassCount}/${testCases.length} tests passed.\n`);

  // Test 2: Message Pitch Template Generation (Website vs Ads)
  console.log('--- TEST 2: Message Pitch Copywriting (Website vs Ads) ---');
  
  // 2A: Website Pitch
  const websitePitch = buildWhatsAppPitch(
    'Aja | World Kitchen & Bar - Chandigarh',
    'https://leadflow-pitches.pages.dev/aja-world-kitchen-bar-chandigarh',
    '4.8',
    'Food & Beverage',
    'website',
    'Chandigarh'
  );
  console.log('--- 2A: Generated Website Pitch ---\n' + websitePitch);
  if (websitePitch.includes('Aja') && websitePitch.includes('much grander') && websitePitch.includes('https://leadflow-pitches.pages.dev/aja-world-kitchen-bar-chandigarh')) {
    console.log('✅ Website pitch template verification passed.');
  } else {
    console.error('❌ Website pitch template verification failed.');
  }

  // 2B: Ads Pitch
  const adsPitch = buildWhatsAppPitch(
    'Pashtun Restaurant',
    'https://pashtun.in',
    '4.5',
    'Restaurant & Dining',
    'ads',
    'Chandigarh'
  );
  console.log('\n--- 2B: Generated Ads Pitch ---\n' + adsPitch);
  if (adsPitch.includes('Pashtun') && adsPitch.includes('Instagram and Google ads') && adsPitch.includes('LeadFirst AI')) {
    console.log('✅ Ads pitch template verification passed.');
  } else {
    console.error('❌ Ads pitch template verification failed.');
  }

  // Test 3: Safe Dispatch Execution (Simulator / Dry-Run)
  console.log('\n--- TEST 3: Dispatch Execution (Simulator Mode) ---');
  const dispatchRes = await sendWhatsAppPitch(
    '+91 98887 88802',
    'Aja | World Kitchen & Bar',
    'https://leadflow-pitches.pages.dev/aja-world-kitchen-bar-chandigarh',
    '4.8',
    'Food & Beverage'
  );
  console.log('Dispatch Result:', dispatchRes);
  if (dispatchRes.success) {
    console.log('✅ Dispatch execution completed successfully.');
  } else {
    console.error('❌ Dispatch execution failed.');
  }

  console.log('\n========================================');
  console.log('🎉 ALL WHATSAPP TESTS COMPLETED!');
  console.log('========================================');
}

runTests().catch(console.error);
