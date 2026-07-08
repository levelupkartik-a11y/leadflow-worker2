const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Replicate = require('replicate');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function processImages(researchData, copyData, buildDir, templateId) {
  console.log('[Step 5] Starting Image Pipeline...');

  // Helper to sanitize filenames in a directory to prevent URL/path issues
  function sanitizeFolderFilenames(dir) {
    if (!fs.existsSync(dir)) return;
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const ext = path.extname(file);
        const base = path.basename(file, ext);
        // Replace spaces, dots, ellipses, and other special chars with a clean underscore
        let sanitizedBase = base
          .replace(/[\s\.…\-\+]+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '');
        if (!sanitizedBase) sanitizedBase = 'image_' + Date.now();
        
        const newName = sanitizedBase + ext.toLowerCase();
        if (newName !== file) {
          const oldPath = path.join(dir, file);
          const newPath = path.join(dir, newName);
          fs.renameSync(oldPath, newPath);
          console.log(`[Sanitizer] Renamed curated file: ${file} -> ${newName}`);
        }
      });
    } catch (err) {
      console.warn(`[Sanitizer] Warning: Failed to sanitize folder ${dir}:`, err.message);
    }
  }

  // Automatically sanitize both source template and build directory copies of the curated folder
  const sourceCuratedPath = path.join(__dirname, '..', 'templates', templateId, 'assets', 'curated');
  const buildCuratedPath = path.join(buildDir, 'assets', 'curated');

  sanitizeFolderFilenames(sourceCuratedPath);
  sanitizeFolderFilenames(buildCuratedPath);

  // Load curated files dynamically if they exist
  let curatedImages = [];
  if (fs.existsSync(buildCuratedPath)) {
    try {
      const files = fs.readdirSync(buildCuratedPath);
      curatedImages = files
        .filter(f => f.match(/\.(jpe?g|png|webp|gif)$/i))
        .map(f => `assets/curated/${f}`)
        .sort();
      console.log(`[Step 5] Loaded ${curatedImages.length} curated images for template ${templateId}:`, curatedImages);
    } catch (err) {
      console.warn(`[Step 5] Failed to read curated files:`, err.message);
    }
  }
  let curatedIndex = 0;

  const CURATED_FALLBACKS = {
    'healthcare-dental': [
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200', // Modern clinic lobby
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?q=80&w=1200', // Dentist chair / professional setting
      'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=1200', // Dental office tools / tech
      'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=1200', // Clean patient room
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200', // Doctor consulting patient
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1200', // Close-up of medical scanner
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=1200'  // Modern laboratory/tools
    ],
    'New folder (4)': [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200', // Restaurant interior
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200', // Delicious plate
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1200', // Pizza
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200'  // Burger
    ],
    'beauty and salon': [
      'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=1200', // Spa room
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200', // Salon wash
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=1200', // Manicure
      'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=1200'  // Facial
    ],
    'realestate': [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200', // House exterior
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200', // Kitchen
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200', // Living room
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200'  // Bathroom
    ],
    'New folder (5)': [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200', // Modern workspace/office
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1200', // Consultation / business meeting
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200', // Modern skyscraper exterior
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200'  // Desk/writing/planning
    ]
  };

  const files = fs.readdirSync(buildDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  let availablePhotos = [...(researchData.photos || [])];

  for (const file of htmlFiles) {
    const filePath = path.join(buildDir, file);
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent);
    const images = $('img');

    if (images.length === 0) continue;

    console.log(`Processing ${images.length} images in ${file}...`);
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < images.length; i++) {
      await sleep(6000); // Sleep for 6 seconds to respect rate limits
      const img = $(images[i]);
      const imgId = img.attr('id') || `img-${i}`;
      // Enhanced context extraction
      let contextText = img.parent().text().trim();
      if (!contextText) contextText = img.parent().parent().text().trim();
      contextText = contextText.replace(/\s+/g, ' ').trim().substring(0, 100);
      const parentHtml = img.parent().html()?.slice(0, 300) || '';

      // --- CURATED LOCAL IMAGE FOLDER CONVENTION ---
      // If a curated folder has files, we dynamically map them to people-facing/branded slots.
      if (curatedImages.length > 0) {
        const parentHtmlLower = parentHtml.toLowerCase();
        const contextLower = contextText.toLowerCase();

        const isPeopleOrBranded = 
          img.hasClass('author-avatar') || 
          img.hasClass('avatar') ||
          parentHtmlLower.includes('avatar') || 
          parentHtmlLower.includes('testimonial') ||
          parentHtmlLower.includes('team') ||
          parentHtmlLower.includes('member') ||
          parentHtmlLower.includes('staff') ||
          parentHtmlLower.includes('about') ||
          contextLower.includes('client') || 
          contextLower.includes('review') ||
          contextLower.includes('avatar') ||
          contextLower.includes('agent') ||
          contextLower.includes('stylist') ||
          contextLower.includes('team') ||
          contextLower.includes('staff') ||
          contextLower.includes('portrait') ||
          contextLower.includes('owner') ||
          contextLower.includes('founder') ||
          contextLower.includes('doctor') ||
          contextLower.includes('expert') ||
          parentHtmlLower.includes('hero-image-wrapper') || 
          contextLower.includes('hero');

        // Check if it is a client avatar specifically
        const isAvatar = img.hasClass('author-avatar') || 
                         parentHtmlLower.includes('author-avatar') || 
                         parentHtmlLower.includes('testimonial') ||
                         contextLower.includes('client') || 
                         contextLower.includes('review');

        if (isPeopleOrBranded) {
          if (isAvatar) {
            // Testimonial avatars: Use professional, generic portrait headshots from Unsplash (Option A)
            const avatarList = [
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
              'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400',
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400'
            ];
            const avatarUrl = avatarList[i % avatarList.length];
            basePrompt = `Client avatar portrait`;
            finalUrl = avatarUrl;
            isUnsplashDirect = true;
            console.log(`Slot ${imgId} -> Curated Client Avatar (Option A): ${finalUrl}`);
          } else {
            // General people/branded/lobby slot: map dynamically from the local curated folder
            const localFile = curatedImages[curatedIndex % curatedImages.length];
            curatedIndex++;

            img.attr('src', localFile);
            img.removeAttr('srcset');
            console.log(`Slot ${imgId} -> Mapped to Curated Local Photo: ${localFile}`);
            continue; // Skip Groq matching, Pollinations, and download pipeline
          }
        }
      }

      const prompt = `
You need to pick or generate the best image for a specific slot on a website.
Business Name: ${researchData.title}
Category: ${researchData.category}
Image Slot Context (Surrounding Text/HTML):
${contextText}
${parentHtml}

Available Real Photos from the Business:
${availablePhotos.map((url, idx) => `[ID: ${idx}] ${url}`).join('\n')}

Task: Decide if one of the real photos fits this slot perfectly. If so, return its ID. If no real photo fits, or there are no photos left, you must provide a detailed prompt to generate a high-quality, realistic stock photo.

CRITICAL RULE: The generation_prompt MUST strictly and directly reflect the specific heading or text of this section.
- If the section mentions "Chinese Cuisine", the prompt MUST explicitly describe "Chinese food, stir-fry, noodles".
- If it mentions "Non-Vegetarian", it MUST describe a "meat dish".
- DO NOT use generic prompts. Tailor the visual exactly to the text context.

Output strictly as JSON:
{
  "action": "use_real_photo" | "generate_new",
  "selected_photo_id": <number or null>,
  "generation_prompt": "<detailed prompt if action is generate_new, else null>"
}
`;

      let decision;
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          })
        });

        const json = await res.json();
        if (!res.ok) throw new Error(`Groq error: ${JSON.stringify(json)}`);
        
        decision = JSON.parse(json.choices[0].message.content);
      } catch (err) {
        console.warn(`Groq matching failed for slot ${imgId}, defaulting to generate.`);
        decision = { action: 'generate_new', generation_prompt: `A professional stock photo matching the text: ${contextText.slice(0, 50)}` };
      }

      let basePrompt = '';
      let finalUrl = '';

      if (decision.action === 'generate_new' && (!decision.generation_prompt || decision.generation_prompt === 'null')) {
         decision.generation_prompt = `High quality, professional stock photography of ${researchData.category}, matching text: ${contextText.slice(0, 100)}`;
      }

      let isUnsplashDirect = false;

      if (decision.action === 'use_real_photo' && decision.selected_photo_id !== null && availablePhotos[decision.selected_photo_id]) {
        const originalUrl = availablePhotos[decision.selected_photo_id];
        console.log(`Slot ${imgId} -> Real Photo [${decision.selected_photo_id}]`);
        try {
          if (process.env.REPLICATE_API_TOKEN) {
            console.log(`Enhancing photo with Real-ESRGAN...`);
            const output = await replicate.run(
              "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
              { input: { image: originalUrl, scale: 2 } }
            );
            finalUrl = output;
          } else {
            finalUrl = originalUrl;
          }
        } catch (e) {
          console.warn('Real-ESRGAN failed, using original.', e.message);
          finalUrl = originalUrl;
        }
      } else {
        if (templateId === 'healthcare-dental') {
          const list = CURATED_FALLBACKS['healthcare-dental'];
          finalUrl = list[i % list.length];
          isUnsplashDirect = true;
          console.log(`Slot ${imgId} -> Curated Unsplash (Healthcare preference): ${finalUrl}`);
        } else {
          basePrompt = (decision.generation_prompt || '').replace(/\s+/g, ' ').trim();
          if (!basePrompt || basePrompt === 'null') {
             basePrompt = `High quality, professional stock photography of ${researchData.category}, matching text: ${contextText.slice(0, 100)}`;
          }
          console.log(`Slot ${imgId} -> Generating New: ${basePrompt}`);
          const encodedPrompt = encodeURIComponent(basePrompt + `, highly detailed, photorealistic, professional photography, 4k`);
          finalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
        }
      }

      // -----------------------------------------------------------------------
      // Download with retry — images MUST be local files on Cloudflare Pages.
      // We never fall back to a live remote URL; that causes broken images on
      // the deployed site when Pollinations is slow or rate-limits the browser.
      // -----------------------------------------------------------------------
      const assetsDir = path.join(buildDir, 'assets');
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

      const localFilename = `assets/img-${Date.now()}-${i}.jpg`;
      const localPath = path.join(buildDir, localFilename);

      const MAX_ATTEMPTS = isUnsplashDirect ? 1 : 3; // Unsplash links never fail, no need for multiple retries
      let downloaded = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // On retries, generate a fresh Pollinations URL with a simplified prompt
        if (attempt > 1 && basePrompt) {
          const retryPrompt = `Professional photo of ${researchData.category} representing ${contextText.slice(0, 60)}`;
          console.log(`  Retry ${attempt}/${MAX_ATTEMPTS} with simplified prompt: ${retryPrompt}`);
          const retryEncoded = encodeURIComponent(retryPrompt + `, photorealistic, 4k`);
          finalUrl = `https://image.pollinations.ai/prompt/${retryEncoded}?nologo=true&seed=${Date.now()}`;
          await sleep(8000); // extra pause before retry
        }

        try {
          console.log(`  Downloading image for slot ${imgId} (attempt ${attempt})...`);
          const controller = new AbortController();
          // Generous 45s timeout — Pollinations can take 20–30s on first generation
          const timeout = setTimeout(() => controller.abort(), 45000);
          const imgRes = await fetch(finalUrl, { signal: controller.signal });
          clearTimeout(timeout);

          if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}: ${imgRes.statusText}`);

          const buffer = Buffer.from(await imgRes.arrayBuffer());
          // Reject placeholder/error responses that are suspiciously small (<5KB)
          if (buffer.length < 5000) throw new Error(`Response too small (${buffer.length} bytes) — likely an error page`);

          fs.writeFileSync(localPath, buffer);
          img.attr('src', localFilename);
          img.removeAttr('srcset');
          downloaded = true;
          console.log(`  ✓ Saved ${localFilename} (${(buffer.length / 1024).toFixed(0)} KB)`);
          break;
        } catch (err) {
          console.warn(`  ✗ Attempt ${attempt} failed: ${err.message}`);
        }
      }

      // Final guaranteed fallback: use a category-specific Unsplash image, downloaded locally.
      // Never write a live remote URL into the HTML.
      if (!downloaded) {
        const fallbacksList = CURATED_FALLBACKS[templateId] || CURATED_FALLBACKS['healthcare-dental'];
        const fallbackUrl = fallbacksList[i % fallbacksList.length];
        console.warn(`  All ${MAX_ATTEMPTS} attempts failed. Falling back to curated Unsplash image for slot ${imgId}.`);
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 20000);
          const fbRes = await fetch(fallbackUrl, { signal: controller.signal });
          clearTimeout(timeout);
          if (!fbRes.ok) throw new Error(`Unsplash HTTP ${fbRes.status}`);
          const buffer = Buffer.from(await fbRes.arrayBuffer());
          fs.writeFileSync(localPath, buffer);
          img.attr('src', localFilename);
          img.removeAttr('srcset');
          console.log(`  ✓ Curated Unsplash fallback saved for slot ${imgId}`);
        } catch (fbErr) {
          // Absolute last resort: omit the image src so the browser shows nothing
          // rather than a broken link icon. The QA step will flag this slot.
          console.error(`  ✗ Unsplash fallback also failed: ${fbErr.message}. Slot ${imgId} will be empty.`);
          img.attr('src', '');
          img.removeAttr('srcset');
        }
      }

      // Throttle between slots
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    fs.writeFileSync(filePath, $.html(), 'utf8');
  }

  console.log('[Step 5] Image Pipeline complete.');
}

module.exports = { processImages };
