const fs = require('fs');
const path = require('path');

const TEMPLATE_ASSETS = {
  'healthcare-dental': [
    { name: '01_modern_clinic_lobby.jpg', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200' },
    { name: '02_dentist_treatment.jpg', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1200' },
    { name: '03_dental_technology.jpg', url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1200' },
    { name: '04_patient_care_room.jpg', url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=1200' },
    { name: '05_doctor_consultation.jpg', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200' }
  ],
  'New folder (4)': [
    { name: '01_rustic_table_feast.jpg', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1200' },
    { name: '02_heirloom_galette.jpg', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200' },
    { name: '03_citrus_salad.jpg', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=1200' },
    { name: '04_wild_mushroom_risotto.jpg', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200' },
    { name: '05_restaurant_ambiance.jpg', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200' }
  ],
  'realestate': [
    { name: '01_luxury_villa_exterior.jpg', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200' },
    { name: '02_designer_living_room.jpg', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200' },
    { name: '03_modern_kitchen.jpg', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200' },
    { name: '04_penthouse_terrace.jpg', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200' }
  ],
  'New folder (5)': [
    { name: '01_modern_workspace.jpg', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200' },
    { name: '02_consultation_meeting.jpg', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200' },
    { name: '03_technician_tools.jpg', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200' },
    { name: '04_business_building.jpg', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200' }
  ],
  'Landingpagetemplate': [
    { name: '01_gym_hero.jpg', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200' },
    { name: '02_workout_session.jpg', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200' },
    { name: '03_yoga_wellness.jpg', url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=1200' }
  ]
};

async function downloadFileWithFetch(url, destPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 5000) throw new Error('File too small or invalid');
    fs.writeFileSync(destPath, buffer);
    return buffer.length;
  } catch (err) {
    clearTimeout(timeout);
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (e) {}
    }
    throw err;
  }
}

async function main() {
  for (const [templateId, assets] of Object.entries(TEMPLATE_ASSETS)) {
    const targetDir = path.join(__dirname, '..', 'templates', templateId, 'assets', 'curated');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    console.log(`\n[${templateId}] Processing ${assets.length} curated images...`);
    for (const asset of assets) {
      const dest = path.join(targetDir, asset.name);
      if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
        console.log(`  ✓ Already exists: ${asset.name} (${Math.round(fs.statSync(dest).size / 1024)} KB)`);
        continue;
      }
      try {
        const size = await downloadFileWithFetch(asset.url, dest);
        console.log(`  ✓ Downloaded: ${asset.name} (${Math.round(size / 1024)} KB)`);
      } catch (err) {
        console.error(`  ✗ Failed to download ${asset.name}:`, err.message);
      }
    }
  }
  console.log('\nAll curated template assets processing complete!');
}

main().catch(console.error);
