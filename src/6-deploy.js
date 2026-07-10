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
    .substring(0, 40);
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
  console.log('[Step 6] Running Deployment Pipeline...');

  const projectName = await getDeterministicProjectName(businessName, rowId, sheetName);
  console.log(`[Step 6] Target project name: ${projectName}`);

  const ghPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';

  try {
    // 1. Get authenticated GitHub owner and token
    console.log('[GitHub] Fetching credentials via GitHub CLI...');
    const owner = execSync(`"${ghPath}" api user --jq .login`, { encoding: 'utf8' }).trim();
    const token = execSync(`"${ghPath}" auth token`, { encoding: 'utf8' }).trim();
    
    // 2. Initialize local Git repository inside build folder
    console.log('[GitHub] Initializing Git repository...');
    try {
      execSync('git init', { cwd: buildDir, stdio: 'ignore' });
      execSync('git config user.name "LeadFlow Worker"', { cwd: buildDir, stdio: 'ignore' });
      execSync('git config user.email "worker@leadflow.agency"', { cwd: buildDir, stdio: 'ignore' });
      execSync('git add .', { cwd: buildDir, stdio: 'ignore' });
      execSync('git commit -m "LeadFlow Build Deploy"', { cwd: buildDir, stdio: 'ignore' });
    } catch (gitErr) {
      console.warn('[GitHub] Non-fatal Git init/commit warning:', gitErr.message);
    }

    // 3. Create or verify remote GitHub repository
    let repoExists = false;
    try {
      execSync(`"${ghPath}" repo view "${owner}/${projectName}"`, { stdio: 'ignore' });
      repoExists = true;
      console.log(`[GitHub] Repository "${owner}/${projectName}" already exists.`);
    } catch (e) {
      // Repository doesn't exist
    }

    if (!repoExists) {
      console.log(`[GitHub] Creating private repository "${owner}/${projectName}"...`);
      execSync(`"${ghPath}" repo create "${projectName}" --private`, { stdio: 'pipe' });
    }

    // 4. Force push to main branch
    console.log('[GitHub] Pushing build artifacts to GitHub main branch...');
    const remoteUrl = `https://oauth2:${token}@github.com/${owner}/${projectName}.git`;
    try {
      execSync(`git remote add origin "${remoteUrl}"`, { cwd: buildDir, stdio: 'ignore' });
    } catch (remoteErr) {
      // Remote might already exist if re-running
    }
    try {
      execSync('git checkout -b main', { cwd: buildDir, stdio: 'ignore' });
    } catch (branchErr) {
      // Branch might already exist
    }
    execSync('git push -u origin main --force', { cwd: buildDir, stdio: 'pipe' });
    console.log(`[GitHub] Successfully pushed to https://github.com/${owner}/${projectName}`);

    // 5. Cloudflare Pages Project Creation & Deploy
    console.log('[Cloudflare] Deploying to Cloudflare Pages...');
    const createCmd = `npx wrangler pages project create "${projectName}" --production-branch main`;
    const deployCmd = `npx wrangler pages deploy "${buildDir}" --project-name "${projectName}" --commit-dirty=true`;

    try {
      execSync(createCmd, { env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
      console.log(`[Cloudflare] Created new Pages project "${projectName}".`);
    } catch (e) {
      if (e.message.includes('already exists') || e.stderr?.includes('already exists') || e.stdout?.includes('already exists')) {
        console.log(`[Cloudflare] Pages project "${projectName}" already exists. Deploying update to it.`);
      } else {
        console.warn('[Cloudflare] Project creation returned error/warning:', e.message);
      }
    }

    const output = execSync(deployCmd, { 
      env: { ...process.env, CI: 'true' }, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);

    // 6. Extract the correct main project URL from Wrangler output dynamically
    const match = output.match(/https:\/\/[a-zA-Z0-9.-]+\.pages\.dev/);
    let url = match ? match[0] : `https://${projectName}.pages.dev`;
    if (match) {
      const parsedUrl = new URL(match[0]);
      const hostnameParts = parsedUrl.hostname.split('.');
      if (hostnameParts.length > 3) {
        // Strip the unique hash prefix (e.g., "9e5d5fcc.punjabi-dhaba-c8u.pages.dev" -> "punjabi-dhaba-c8u.pages.dev")
        hostnameParts.shift();
      }
      url = `https://${hostnameParts.join('.')}`;
    }

    console.log(`[Step 6] Deployed successfully to: ${url}`);
    return url;

  } catch (err) {
    console.error('[Step 6] Deployment Pipeline FAILED.');
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw err;
  }
}

module.exports = { deployToCloudflare };
