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

    for (let i = 0; i < images.length; i++) {
      const img = $(images[i]);
      const imgId = img.attr('id') || `img-${i}`;
      const parentHtml = img.parent().html()?.slice(0, 300) || '';

      const prompt = `
You need to pick the best image for a specific slot on a website.
Business Name: ${researchData.title}
Category: ${researchData.category}
Image Slot Context (Surrounding HTML): ${parentHtml}

Available Real Photos from the Business:
${availablePhotos.map((url, idx) => `[ID: ${idx}] ${url}`).join('\n')}

Task: Decide if one of the real photos fits this slot perfectly. If so, return its ID. If no real photo fits, or there are no photos left, you must provide a detailed prompt to generate a high-quality, realistic stock photo using an AI image generator.

Output strictly as JSON:
{
  "action": "use_real_photo" | "generate_new",
  "selected_photo_id": <number or null>,
  "generation_prompt": "<detailed prompt if action is generate_new, else null>"
}
`;

      let decision;
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        decision = JSON.parse(response.text);
      } catch (err) {
        console.warn(`Gemini matching failed for slot ${imgId}, defaulting to generate.`);
        decision = { action: 'generate_new', generation_prompt: `A professional stock photo for a ${researchData.category} business named ${researchData.title}` };
      }

      let finalUrl = '';

      if (decision.action === 'use_real_photo' && decision.selected_photo_id !== null && availablePhotos[decision.selected_photo_id]) {
        const originalUrl = availablePhotos[decision.selected_photo_id];
        console.log(`Slot ${imgId} -> Real Photo [${decision.selected_photo_id}]`);
        // Remove it so it's not reused for another main slot, or keep it. Let's keep it but ideally we'd remove it.
        // Let's optionally enhance via Replicate if we assume it's low quality, 
        // but to save time/cost, we will just use it directly, or enhance it if instructed.
        // The user asked: "enhance low-quality photos via Replicate/Real-ESRGAN". 
        // We'll run it through Real-ESRGAN to ensure high quality.
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
        // Use Pollinations.ai for free generation
        const encodedPrompt = encodeURIComponent(decision.generation_prompt + `, highly detailed, photorealistic, professional photography, 4k`);
        finalUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
      }

      img.attr('src', finalUrl);
      img.removeAttr('srcset'); // Remove srcset to ensure the new src is used
    }

    fs.writeFileSync(filePath, $.html(), 'utf8');
  }

  console.log('[Step 5] Image Pipeline complete.');
}

module.exports = { processImages };
