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

**CURRENCY RULE:**
- All pricing, rates, fees, or cost-related content MUST be written in Indian Rupees (₹), NEVER dollars ($).
- Do not use the word "dollars" or "USD".
- If you mention pricing in the copy, use realistic Indian pricing (e.g., "starts at ₹499" instead of "$49").
- Translate any maps price level indicator ($ / $$ / $$$) to a rupee-appropriate range (e.g., ₹200-₹500 for $$, or premium pricing for $$$), never copy the dollar symbols literally.

**CRITICAL RULE — NEVER INVENT PEOPLE:**
Do NOT invent, fabricate, or hallucinate any named individuals — staff members, doctors, founders, employees, or any other person associated with the business.
The "team_members" field MUST only be populated if real staff names/roles are present in the Business Research above.
If no staff data is present, return an empty array [] for team_members. This is non-negotiable.
A fabricated doctor or staff member on a real business's website is a serious legal and trust violation.

**Examples of Good Copy:**
${referenceKit.examples.map(ex => `- [${ex.category}]: ${ex.text}`).join('\n')}

**Testimonials Instructions:**
If the Real Reviews array is empty or missing, return an empty array \`[]\` for testimonials. Do NOT hallucinate reviews. If reviews exist, select 2 to 5 of the best ones. Trim each review's text down to 1-2 punchy sentences. Anonymize the reviewer's name (First name + Last initial). Assume a rating of 5 if not provided.

**Team Members Instructions:**
Only populate team_members from the Business Research above. If no named staff are mentioned, return [].

**Required Output (JSON):**
Produce a JSON object with exactly these keys:
{
  "headline": "...",
  "tagline": "One short line under the headline.",
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
  "team_members": [
    {
      "name": "Real name from research only",
      "role": "Real role from research only",
      "bio": "1-2 sentences from research only"
    }
  ],
  "cta": "...",
  "tone_summary": "Brief summary of the determined tone and standout traits."
}
`;

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
  
  const text = json.choices[0].message.content;
  const copy = JSON.parse(text);

  console.log(`[Step 2] Copy generation complete.`);
  return copy;
}

module.exports = { generateCopy };
