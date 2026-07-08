const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Replicate = require('replicate');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function processImages(researchData, copyData, buildDir) {
  console.log('[Step 5] Starting Image Pipeline...');

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
      if (!contextText) contextText = img.parent().parent().text().trim().substring(0, 200);
      const parentHtml = img.parent().html()?.slice(0, 300) || '';

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

      let finalUrl = '';

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
        console.log(`Slot ${imgId} -> Generating New: ${decision.generation_prompt}`);
        const encodedPrompt = encodeURIComponent(decision.generation_prompt + `, highly detailed, photorealistic, professional photography, 4k`);
        finalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
      }

      // Download the image so it is hosted locally on Cloudflare Pages
      try {
        console.log(`Downloading image for slot ${imgId}...`);
        const res = await fetch(finalUrl);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        const buffer = await res.arrayBuffer();
        
        // Ensure assets directory exists
        const assetsDir = path.join(buildDir, 'assets');
        if (!fs.existsSync(assetsDir)) {
          fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        const localFilename = `assets/img-${Date.now()}-${i}.jpg`;
        const localPath = path.join(buildDir, localFilename);
        fs.writeFileSync(localPath, Buffer.from(buffer));
        
        img.attr('src', localFilename);
      } catch (downloadErr) {
        console.warn(`Failed to download image, using remote URL as fallback:`, downloadErr.message);
        img.attr('src', finalUrl);
      }
      
      img.removeAttr('srcset'); 
    }

    fs.writeFileSync(filePath, $.html(), 'utf8');
  }

  console.log('[Step 5] Image Pipeline complete.');
}

module.exports = { processImages };
