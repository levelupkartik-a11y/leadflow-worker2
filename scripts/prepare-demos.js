const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const pitchesDir = path.join(repoRoot, 'pitches');

if (!fs.existsSync(pitchesDir)) {
  fs.mkdirSync(pitchesDir, { recursive: true });
}

const demos = [
  { name: 'demo-salon', src: path.join(repoRoot, 'templates', 'beauty and salon') },
  { name: 'demo-healthcare', src: path.join(repoRoot, 'templates', 'healthcare-dental') },
  { name: 'demo-restaurant', src: path.join(repoRoot, 'templates', 'New folder (4)') },
  { name: 'demo-realestate', src: path.join(repoRoot, 'templates', 'realestate') },
  { name: 'demo-services', src: path.join(repoRoot, 'templates', 'New folder (5)') },
  { name: 'demo-fitness', src: path.join(repoRoot, 'templates', 'Landingpagetemplate', 'dist') },
];

for (const demo of demos) {
  const dest = path.join(pitchesDir, demo.name);
  console.log(`Copying ${demo.src} -> ${dest}`);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.cpSync(demo.src, dest, {
    recursive: true,
    filter: (src) => !src.includes('node_modules') && !src.includes('.git')
  });
}

console.log('All demo templates copied into pitches/ successfully!');
