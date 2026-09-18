const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { composioExecute } = require('./utils');

/**
 * Slugify a display name to get a clean, safe project/repo name.
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\-\-+/g, '-')
    .substring(0, 40)
    .replace(/^-|-$/g, '');
}

/**
 * Determine a unique, deterministic project name using the Google Sheet as the registry.
 */
async function getDeterministicProjectName(businessName, rowId, sheetName) {
  const slug = slugify(businessName);
  if (!rowId) return slug;

  try {
    const colLetter = (sheetName === 'Sector 17 Chandigarh') ? 'K' : 'N';
    const res = await composioExecute('GOOGLESHEETS_VALUES_GET', {
      spreadsheet_id: '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k',
      range: `${sheetName}!${colLetter}1:${colLetter}100`,
      value_render_option: 'FORMATTED_VALUE'
    });

    const values = res?.data?.values || [];
    let collision = false;
    for (let i = 0; i < values.length; i++) {
      const currentRowId = i + 1;
      if (currentRowId === parseInt(rowId)) continue;
      const url = values[i]?.[0];
      if (url && url.includes(slug)) {
        collision = true;
        break;
      }
    }

    if (collision) {
      console.log(`[Naming] Collision detected for slug "${slug}" with another row. Appending rowId.`);
      return `${slug}-${rowId}`;
    }
  } catch (err) {
    console.warn('[Naming] Failed to check for collisions in sheet:', err.message);
  }

  return slug;
}

async function deployToCloudflare(buildDir, businessName, rowId, sheetName) {
  console.log('[Step 6] Running Deployment Pipeline (Consolidated Subdirectory Mode)...');

  const projectName = await getDeterministicProjectName(businessName, rowId, sheetName);
  console.log(`[Step 6] Target project name (subdirectory): ${projectName}`);

  let ghPath = 'gh';
  if (process.platform === 'win32') {
    try {
      execSync('where gh', { stdio: 'ignore' });
    } catch (e) {
      ghPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';
    }
  }

  // 1. Fetch credentials
  let token = process.env.GITHUB_TOKEN || '';
  let owner = process.env.GITHUB_REPOSITORY_OWNER || '';

  if (!token) {
    try {
      token = execSync(`"${ghPath}" auth token`, { encoding: 'utf8' }).trim();
    } catch (e) {}
  }
  if (!owner && token) {
    try {
      const envWithGit = { ...process.env, GITHUB_TOKEN: token };
      owner = execSync(`"${ghPath}" api user --jq .login`, { env: envWithGit, encoding: 'utf8' }).trim();
    } catch (e) {}
  }

  const pitchesRepoName = 'leadflow-worker2';
  const pitchesProjectName = 'leadflow-pitches';
  const repoRootDir = path.resolve(__dirname, '..');
  const pitchesDir = path.join(repoRootDir, 'pitches');

  try {
    const envWithGit = { ...process.env, GITHUB_TOKEN: token };

    // Ensure pitches folder exists
    if (!fs.existsSync(pitchesDir)) {
      fs.mkdirSync(pitchesDir, { recursive: true });
    }

    // 4. Copy build folder contents into a subdirectory in pitches/
    const destDir = path.join(pitchesDir, projectName);
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    
    // Copy all files except functions folder into the subdirectory
    fs.cpSync(buildDir, destDir, { 
      recursive: true,
      filter: (src) => !src.includes('functions')
    });

    // Also copy functions folder to pitches/functions so serverless chat is deployed at root level
    const functionsSrc = path.join(buildDir, 'functions');
    const functionsDest = path.join(pitchesDir, 'functions');
    if (fs.existsSync(functionsSrc)) {
      if (fs.existsSync(functionsDest)) {
        fs.rmSync(functionsDest, { recursive: true, force: true });
      }
      fs.cpSync(functionsSrc, functionsDest, { recursive: true });
    }

    // 5. Commit and push back to GitHub
    console.log('[GitHub] Committing new pitch to pitches/ directory...');
    try {
      execSync(`git add pitches/${projectName}`, { cwd: repoRootDir, stdio: 'ignore' });
      execSync(`git commit -m "Add pitch: ${projectName}"`, { cwd: repoRootDir, stdio: 'ignore' });
      try {
        execSync(`git pull --rebase origin main`, { cwd: repoRootDir, env: envWithGit, stdio: 'ignore' });
      } catch (pullErr) {}
      execSync(`git -c credential.helper="" -c core.askpass="" push origin main`, { 
        cwd: repoRootDir, 
        env: envWithGit, 
        stdio: 'pipe' 
      });
      console.log(`[GitHub] Pushed pitch ${projectName} to remote.`);
    } catch (commitErr) {
      console.log('[GitHub] Pitch commit/push notice:', commitErr.message);
    }

    // 6. Deploy the pitches folder to Cloudflare Pages (single project "leadflow-pitches")
    console.log('[Cloudflare] Deploying pitches folder to Cloudflare Pages...');
    const createCmd = `npx wrangler pages project create "${pitchesProjectName}" --production-branch main`;
    const deployCmd = `npx wrangler pages deploy pitches --project-name "${pitchesProjectName}" --branch main --commit-dirty=true`;

    try {
      execSync(createCmd, { cwd: repoRootDir, env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
      console.log(`[Cloudflare] Central Pages project "${pitchesProjectName}" ready.`);
    } catch (e) {
      // project already exists is fine
    }

    // Upload GROQ_API_KEY secret securely if available
    if (process.env.GROQ_API_KEY) {
      try {
        const secretCmd = `echo ${process.env.GROQ_API_KEY} | npx wrangler pages secret put GROQ_API_KEY --project-name "${pitchesProjectName}"`;
        execSync(secretCmd, { cwd: repoRootDir, env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
      } catch (secretErr) {
        // Non-fatal
      }
    }

    const output = execSync(deployCmd, { 
      cwd: repoRootDir,
      env: { ...process.env, CI: 'true' }, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);

    const liveUrl = `https://${pitchesProjectName}.pages.dev/${projectName}`;
    console.log(`[Step 6] Deployed successfully to: ${liveUrl}`);
    return liveUrl;

  } catch (err) {
    console.error('[Step 6] Deployment Pipeline FAILED.');
    try {
      fs.rmSync(tempCloneDir, { recursive: true, force: true });
    } catch (e) {}
    throw err;
  }
}

module.exports = { deployToCloudflare };
