const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateCopy(researchData) {
  console.log(`[Step 2] Generating copy for ${researchData.title}...`);

  const referenceKitPath = path.join(__dirname, '../config/reference-kit.json');
  const referenceKit = JSON.parse(fs.readFileSync(referenceKitPath, 'utf8'));

  const prompt = `
You are an expert copywriter. Your task is to write website copy for the following business based strictly on the provided research facts. Do NOT invent or hallucinate any facts, services, or testimonials. Use ONLY the provided research.

**Business Research:**
Name: ${researchData.title}
Category: ${researchData.category}
Description: ${researchData.description}
Hours: ${researchData.hours}
Address: ${researchData.address}
Price Level: ${researchData.priceLevel}
Attributes: ${JSON.stringify(researchData.attributes)}
Real Reviews: ${JSON.stringify(researchData.reviews)}

**Style Guide & Rules:**
Tone: ${referenceKit.style_guide.tone}
Banned Words: ${referenceKit.style_guide.banned_words.join(', ')}
Max Sentence Length: ${referenceKit.style_guide.max_sentence_length} words
Headlines: ${referenceKit.style_guide.headlines}
Body Copy: ${referenceKit.style_guide.body_copy}
Testimonials Rule: ${referenceKit.style_guide.testimonials}

**Examples of Good Copy:**
${referenceKit.examples.map(ex => `- [${ex.category}]: ${ex.text}`).join('\n')}

**Required Output (JSON):**
Produce a JSON object with exactly these keys:
{
  "headline": "...",
  "about_section": "...",
  "services": [
    { "name": "...", "description": "..." }
  ],
  "testimonials": [
    { "quote": "...", "author_initials": "..." }
  ],
  "cta": "...",
  "tone_summary": "Brief summary of the determined tone and standout traits."
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const text = response.text;
  const copy = JSON.parse(text);

  console.log(`[Step 2] Copy generation complete.`);
  return copy;
}

module.exports = { generateCopy };
