const { execSync } = require('child_process');

async function deployToCloudflare(buildDir, businessName, businessId) {
  console.log('[Step 6] Deploying to Cloudflare Pages...');

  // Create a safe project name from businessName and businessId
  let projectName = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${businessId}`;
  
  // Cloudflare Pages project names have a max length of 58 chars
  if (projectName.length > 58) {
    projectName = projectName.substring(0, 58).replace(/-$/, '');
  }

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
