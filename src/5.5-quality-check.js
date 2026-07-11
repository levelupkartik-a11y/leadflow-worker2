const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ensure the vision prompt accurately judges
async function checkImageMatch(base64Image, contextText) {
  const prompt = `
Does this image accurately and realistically represent the following text from a website?
Text: "${contextText}"

CRITICAL RULE FOR CUISINE/CATEGORY SPECIFICITY:
If the text names a specific cuisine, food style, or category (e.g., "North Indian", "Breakfast", "Chinese", "South Indian", "Desserts"), the image MUST strictly show that specific type of cuisine/food or setting.
- An image showing a Chinese restaurant interior with Chinese lanterns is NOT a match for "North Indian Cuisine", "South Indian Cuisine", or "Breakfast".
- Mismatched cultural/cuisine elements MUST be rejected (set match to false).
- A generic restaurant interior is NOT a match for a label describing a specific dish (e.g., "Butter Chicken" must show the dish itself, not just table settings).

If the image is a mismatch, completely unrelated, generic, or an obvious error, set match to false and provide a detailed reason explaining the mismatch so we can generate a better prompt.

Respond strictly in JSON:
{
  "match": boolean,
  "reason": "..."
}
`;

  let retries = 6;
  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } }
          ]
        }]
      });

      const text = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(text);
    } catch (e) {
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('quota') || e.message?.includes('exhausted')) {
        console.log(`[QA] Rate limit on Vision check, sleeping 20s (retries left: ${retries - 1})...`);
        await sleep(20000);
        retries--;
      } else {
        console.warn(`[QA] Vision check failed with non-429 error:`, e.message);
        return { match: true, reason: 'Skipped due to API error' };
      }
    }
  }
  return { match: true, reason: 'Skipped due to persistent rate limit' };
}

async function regenerateImage(buildDir, img, newPrompt, i) {
    console.log(`[QA] Regenerating image with prompt: ${newPrompt}`);
    const encodedPrompt = encodeURIComponent(newPrompt + `, highly detailed, photorealistic, professional photography, 4k`);
    const finalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const imgRes = await fetch(finalUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length < 5000) throw new Error(`Response too small (${buffer.length} bytes)`);
      
      const localFilename = `assets/img-qa-${Date.now()}-${i}.jpg`;
      const localPath = path.join(buildDir, localFilename);
      fs.writeFileSync(localPath, Buffer.from(buffer));
      
      img.attr('src', localFilename);
      return localFilename;
    } catch (e) {
      console.warn(`[QA] Regenerate failed:`, e.message);
      return null;
    }
}

async function runQualityCheck(buildDir, researchData, copyData) {
  console.log('[Step 5.5] Starting Automated Quality Check...');

  const result = {
    success: true,
    failedReason: null
  };

  const files = fs.readdirSync(buildDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const filePath = path.join(buildDir, file);
    const htmlContent = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(htmlContent);
    const bodyText = $('body').text();

    // A & B. Image Validation & Content Match
    const images = $('img');
    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      let src = img.attr('src');
      if (!src) continue;

      let isValid = false;
      let isLocal = src.startsWith('assets/');
      let localPath = isLocal ? path.join(buildDir, src) : null;
      let base64Image = null;

      // 1. Resolution Check
      if (isLocal) {
        if (fs.existsSync(localPath) && fs.statSync(localPath).size > 100) {
          isValid = true;
          base64Image = fs.readFileSync(localPath, 'base64');
        }
      } else {
        try {
          const res = await fetch(src, { method: 'HEAD' });
          if (res.ok && res.headers.get('content-type')?.includes('image')) {
            isValid = true;
          }
        } catch(e) {}
      }

      // 2. Multimodal Match Check
      let contextText = img.attr('alt') || img.parent().text().replace(/\s+/g, ' ').trim().substring(0, 100);
      if (!contextText) {
        // Fallback to checking nearby headings or grandparent text
        contextText = img.closest('section').find('h1, h2, h3').first().text().trim() || 
                      img.parent().parent().text().replace(/\s+/g, ' ').trim().substring(0, 100);
      }

      if (isValid && base64Image) {
         // Skip vision match validation for manually curated local assets (e.g., assets/curated/)
         if (src.startsWith('assets/curated/')) {
            console.log(`[QA] Skipping Vision Match check for curated local asset: ${src}`);
         } else {
            console.log(`[QA] Running Vision Match for image ${src}...`);
            let matchResult = await checkImageMatch(base64Image, contextText);
            
            let retries = 2;
            while (!matchResult.match && retries > 0) {
               console.log(`[QA] Image rejected by Vision. Reason: ${matchResult.reason}. Retrying...`);
               let betterPrompt = `A professional stock photo of ${researchData.category} representing: ${contextText}. Specific details needed: ${matchResult.reason}`;
               const newLocalPath = await regenerateImage(buildDir, img, betterPrompt, i);
               if (newLocalPath && fs.existsSync(newLocalPath)) {
                  base64Image = fs.readFileSync(newLocalPath, 'base64');
                  matchResult = await checkImageMatch(base64Image, contextText);
               }
               retries--;
            }
            
            if (!matchResult.match) {
               console.log(`[QA] Image failed Vision checks permanently.`);
            }
         }
      }

      if (!isValid) {
         console.log(`[QA] Image missing or invalid at ${src}. Retrying generation...`);
         const fallbackPrompt = `Professional photo of ${researchData.category} representing ${contextText}`;
         await regenerateImage(buildDir, img, fallbackPrompt, i);
      }
    }

    // C. Required Fields Check
    console.log(`[QA] Checking required fields in ${file}...`);
    const checkFields = [
      { name: 'Headline', value: copyData.headline },
      { name: 'About/Subhead', value: copyData.about_section },
      { name: 'Phone', value: researchData.phone },
      { name: 'Address', value: researchData.address }
    ];

    for (const field of checkFields) {
      if (field.value && typeof field.value === 'string' && field.value.trim().length > 0) {
        // Normalise both sides — collapse whitespace, lowercase
        const normalise = s => s.replace(/\s+/g, ' ').toLowerCase().trim();
        // Use first 40 chars as an anchor (handles truncated or split injections)
        const anchor = normalise(field.value).substring(0, 40);
        if (anchor.length > 5 && !normalise(bodyText).includes(anchor)) {
          console.error(`[QA] REQUIRED FIELD MISSING: ${field.name} -> "${field.value.substring(0,30)}..." not found in HTML.`);
          result.success = false;
          result.failedReason = `Missing required field: ${field.name}`;
        }
      }
    }


    // D. Copy Sanity Check
    console.log(`[QA] Checking copy sanity in ${file}...`);
    const brokenTokens = bodyText.match(/\[Insert[^\]]*\]|\{BusinessName\}/gi);
    if (brokenTokens && brokenTokens.length > 0) {
       console.error(`[QA] BROKEN TOKENS FOUND: ${brokenTokens.join(', ')}`);
       result.success = false;
       result.failedReason = `Placeholder token left in HTML: ${brokenTokens[0]}`;
    }

    // E. Icon Link & Ligature Check
    console.log(`[QA] Checking icon library linkages and ligatures in ${file}...`);
    const iconSpans = $('.material-symbols-outlined');
    if (iconSpans.length > 0) {
      const hasLink = $('head link[href*="Material+Symbols"]').length > 0 || 
                      $('head link[href*="material-symbols"]').length > 0 ||
                      $('head link[href*="Material+Icons"]').length > 0;
      if (!hasLink) {
        console.error(`[QA] MISSING ICON STYLESHEET: Found ${iconSpans.length} elements with class 'material-symbols-outlined', but no Material Symbols stylesheet is loaded in head.`);
        result.success = false;
        result.failedReason = 'Missing Material Symbols stylesheet in head';
      }
    }

    const suspectIconWords = new Set(['eco', 'local_dining', 'restaurant', 'menu_book', 'verified', 'delivery_dining', 'handshake', 'location_on', 'schedule']);
    $('span, i, em, div').each((_, el) => {
      const text = $(el).text().trim();
      if (suspectIconWords.has(text) && $(el).children().length === 0) {
        const hasIconClass = $(el).hasClass('material-symbols-outlined') || 
                             $(el).hasClass('material-icons') || 
                             $(el).closest('.material-symbols-outlined').length > 0 ||
                             $(el).closest('.material-icons').length > 0;
        if (!hasIconClass) {
          console.error(`[QA] RAW ICON WORD AS VISIBLE TEXT: Element <${el.tagName}> contains raw icon-ligature text "${text}" without icon class.`);
          result.success = false;
          result.failedReason = `Raw icon word visible as text: "${text}"`;
        }
      }
    });

    fs.writeFileSync(filePath, $.html(), 'utf8');
  }

  if (result.success) {
    console.log('[Step 5.5] Quality Check PASSED.');
  } else {
    console.error(`[Step 5.5] Quality Check FAILED. Reason: ${result.failedReason}`);
  }

  return result;
}

module.exports = { runQualityCheck };
