const { execSync } = require('child_process');

async function deployToCloudflare(buildDir, businessName, businessId) {
  console.log('[Step 6] Deploying to Cloudflare Pages...');

  // Derive a slug from the business name: lowercase, spaces→hyphens, strip special chars, max 50 chars
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);
  const projectName = `${slug}-${businessId}`;
  console.log(`Target project name: ${projectName}`);

  const createCmd = `npx wrangler pages project create "${projectName}" --production-branch main`;
  const deployCmd = `npx wrangler pages deploy "${buildDir}" --project-name "${projectName}" --commit-dirty=true`;
  
  try {
    // Create the project first
    try {
      execSync(createCmd, { env: { ...process.env, CI: 'true' }, encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
      // It might already exist, which is fine
      if (!e.message.includes('already exists') && !e.stderr?.includes('already exists')) {
        console.warn('Project creation returned an error, but we will try deploying anyway:', e.message);
      }
    }

    // Deploy
    const output = execSync(deployCmd, { 
      env: { ...process.env, CI: 'true' }, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    console.log(output);

    // Extract the URL from Wrangler output
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.${projectName}\.pages\.dev/);
    if (match) {
      const url = match[0];
      console.log(`[Step 6] Deployed successfully to: ${url}`);
      return url;
    } else {
      // Fallback standard URL format
      const fallbackUrl = `https://${projectName}.pages.dev`;
      console.log(`[Step 6] Deployed successfully. URL might be: ${fallbackUrl}`);
      return fallbackUrl;
    }

  } catch (err) {
    console.error('Deployment failed.');
    if (err.stdout) console.error(err.stdout);
    if (err.stderr) console.error(err.stderr);
    throw err;
  }
}

module.exports = { deployToCloudflare };
