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

  const pitchesRepoName = 'leadflow-pitches';
  const pitchesProjectName = 'leadflow-pitches';
  const tempCloneDir = path.join(path.dirname(buildDir), `.clone-pitches-${Date.now()}`);

  try {
    const envWithGit = { ...process.env, GITHUB_TOKEN: token };
    let repoExists = false;
    
    if (token && owner) {
      try {
        execSync(`"${ghPath}" repo view "${owner}/${pitchesRepoName}"`, { env: envWithGit, stdio: 'ignore' });
        repoExists = true;
      } catch (e) {}

      if (!repoExists) {
        try {
          console.log(`[GitHub] Creating central repository "${owner}/${pitchesRepoName}"...`);
          execSync(`"${ghPath}" repo create "${pitchesRepoName}" --private`, { env: envWithGit, stdio: 'pipe' });
        } catch (createErr) {
          console.log('[GitHub] Central repository creation warning (it may already exist):', createErr.message);
        }
      }
    }

    // 3. Clone the repo (or initialize it locally if no token/owner)
    console.log('[GitHub] Cloning central pitches repository...');
    if (token && owner) {
      const cloneUrl = `https://oauth2:${token}@github.com/${owner}/${pitchesRepoName}.git`;
      execSync(`git clone "${cloneUrl}" "${tempCloneDir}"`, { stdio: 'pipe' });
    } else {
      fs.mkdirSync(tempCloneDir, { recursive: true });
      execSync('git init', { cwd: tempCloneDir, stdio: 'ignore' });
    }

    // Ensure we have a main branch in the clone
    try {
      execSync('git checkout main', { cwd: tempCloneDir, stdio: 'ignore' });
    } catch (e) {
      try {
        execSync('git checkout -b main', { cwd: tempCloneDir, stdio: 'ignore' });
      } catch (e) {}
    }

    // Configure Git
    try {
      execSync('git config user.name "LeadFlow Worker"', { cwd: tempCloneDir, stdio: 'ignore' });
      execSync('git config user.email "worker@leadflow.agency"', { cwd: tempCloneDir, stdio: 'ignore' });
    } catch (e) {}

    // 4. Copy build folder contents into a subdirectory in the cloned repo
    const destDir = path.join(tempCloneDir, projectName);
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });
    
    // Copy all files except functions folder into the subdirectory
    fs.cpSync(buildDir, destDir, { 
      recursive: true,
      filter: (src) => !src.includes('functions')
    });

    // Also copy functions folder to root of clone so serverless chat is deployed
    const functionsSrc = path.join(buildDir, 'functions');
    const functionsDest = path.join(tempCloneDir, 'functions');
    if (fs.existsSync(functionsSrc)) {
      if (fs.existsSync(functionsDest)) {
        fs.rmSync(functionsDest, { recursive: true, force: true });
      }
      fs.cpSync(functionsSrc, functionsDest, { recursive: true });
    }

    // 5. Commit and push back to GitHub
    console.log('[GitHub] Committing and pushing new pitch subdirectory...');
    execSync('git add .', { cwd: tempCloneDir, stdio: 'ignore' });
    try {
      execSync(`git commit -m "Add pitch: ${projectName}"`, { cwd: tempCloneDir, stdio: 'ignore' });
      if (token && owner) {
        execSync('git push -u origin main --force', { cwd: tempCloneDir, env: envWithGit, stdio: 'pipe' });
      }
    } catch (commitErr) {
      console.log('[GitHub] No changes to commit or push.');
    }

    // 6. Deploy the entire folder to Cloudflare Pages (single project "leadflow-pitches")
    console.log('[Cloudflare] Deploying entire pitches repository to Cloudflare Pages...');
    const createCmd = `npx wrangler pages project create "${pitchesProjectName}" --production-branch main`;
    const deployCmd = `npx wrangler pages deploy . --project-name "${pitchesProjectName}" --branch main --commit-dirty=true`;

    try {
      execSync(createCmd, { env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
      console.log(`[Cloudflare] Created central Pages project "${pitchesProjectName}".`);
    } catch (e) {
      if (e.message.includes('already exists') || e.stderr?.includes('already exists') || e.stdout?.includes('already exists')) {
        console.log(`[Cloudflare] Central Pages project "${pitchesProjectName}" already exists.`);
      } else {
        console.warn('[Cloudflare] Project creation returned warning:', e.message);
      }
    }

    // Upload GROQ_API_KEY secret securely
    if (process.env.GROQ_API_KEY) {
      console.log(`[Cloudflare] Uploading GROQ_API_KEY secret to Pages project "${pitchesProjectName}"...`);
      try {
        const secretCmd = `echo ${process.env.GROQ_API_KEY} | npx wrangler pages secret put GROQ_API_KEY --project-name "${pitchesProjectName}"`;
        execSync(secretCmd, { env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
      } catch (secretErr) {
        console.warn(`[Cloudflare] Non-fatal secret upload warning:`, secretErr.message);
      }
    }

    const output = execSync(deployCmd, { 
      cwd: tempCloneDir,
      env: { ...process.env, CI: 'true' }, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(output);

    // Clean up clone dir
    try {
      fs.rmSync(tempCloneDir, { recursive: true, force: true });
    } catch (e) {}

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
