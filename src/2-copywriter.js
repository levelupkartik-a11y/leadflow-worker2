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

**Testimonials Instructions:**
If the Real Reviews array is empty or missing, return an empty array \`[]\` for testimonials. Do NOT hallucinate reviews. If reviews exist, select 2 to 5 of the best ones. Trim each review's text down to 1-2 punchy sentences. Anonymize the reviewer's name (First name + Last initial). Assume a rating of 5 if not provided.

**Required Output (JSON):**
Produce a JSON object with exactly these keys:
{
  "headline": "...",
  "about_section": "...",
  "services": [
    { "name": "...", "description": "..." }
  ],
  "testimonials": [
    { 
      "text": "1-2 punchy sentences...", 
      "reviewer": "First Name L.", 
      "rating": 5 
    }
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
