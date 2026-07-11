const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Wraps any promise with a hard timeout to prevent indefinite hangs
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

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
- All pricing, rates, fees, or cost-related content MUST be written in Indian Rupees (?), NEVER dollars ($).
- Do not use the word "dollars" or "USD".
- If you mention pricing in the copy, use realistic Indian pricing (e.g., "starts at ?499" instead of "$49").
- Translate any maps price level indicator ($ / $$ / $$$) to a rupee-appropriate range (e.g., ?200-?500 for $$, or premium pricing for $$$), never copy the dollar symbols literally.

**CRITICAL RULE - NEVER INVENT PEOPLE:**
- Do NOT invent, fabricate, or hallucinate any named individuals - staff members, doctors, founders, employees, or any other person associated with the business.
- The "team_members" field MUST only be populated if real staff names/roles are present in the Business Research above.
- If no staff data is present, return an empty array [] for team_members. This is non-negotiable.
- A fabricated doctor or staff member on a real business's website is a serious legal and trust violation.

**CUISINE/BUSINESS TYPE CLEANING RULE:**
- Generate a "cuisine_or_business_type" field (e.g. "Punjabi", "North Indian", "Dental", "Real Estate", "Law", "Beauty", "Gym").
- Naturally rephrase and clean the raw Maps category (e.g., "punjabi restaurant" should become "Punjabi", "beauty salon" should become "Beauty", "real estate agent" should become "Real Estate", "dental clinic" should become "Dental", "law firm" should become "Law"). Strip out generic words like "restaurant", "salon", "agent", "clinic", "firm" so it reads as a clean, capitalized adjective/noun.

**Examples of Good Copy:**
${referenceKit.examples.map(ex => `- [${ex.category}]: ${ex.text}`).join('\n')}

**Testimonials Instructions:**
If the Real Reviews array is empty or missing, generate 3 realistic, anonymous testimonials based on the business type, category, and location (e.g. complimenting the food, service, or atmosphere). Trim each review's text down to 1-2 punchy sentences. Anonymize the reviewer's name (First name + Last initial). If real reviews exist, select 2 to 5 of the best ones. Trim each review's text down to 1-2 punchy sentences. Anonymize the reviewer's name (First name + Last initial). Assume a rating of 5 if not provided.

**Team Members Instructions:**
Only populate team_members from the Business Research above. If no named staff are mentioned, return [].

**FAQs Instructions:**
Generate exactly 10 common questions and short, helpful answers (1-2 sentences each) for the business. These MUST cover: Hours, Location/Address, Price range/pricing info, how to book/contact, and details about specific services or popular menu items based on the research. If facts are not in the research, answer using general helpful info (e.g. "Please call us to confirm prices/availability").

**Required Output (JSON):**
Produce a JSON object with exactly these keys:
{
  "headline": "...",
  "tagline": "One short line under the headline.",
  "about_section": "...",
  "cuisine_or_business_type": "Clean, capitalized adjective/noun for the cuisine or business type (e.g. 'Punjabi', 'Dental', 'Real Estate').",
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
  "faqs": [
    {
      "q": "What are your operating hours?",
      "a": "We are open..."
    }
  ],
  "cta": "...",
  "tone_summary": "Brief summary of the determined tone and standout traits."
}
`;

  let text = '';
  try {
    const controller = new AbortController();
    const groqRes = await withTimeout(
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal,
      }),
      60000, // 60s timeout for Groq fetch
      'Groq fetch'
    );
    const json = await withTimeout(groqRes.json(), 30000, 'Groq body read');
    if (!groqRes.ok) throw new Error(json.error?.message || JSON.stringify(json));
    text = json.choices[0].message.content;
  } catch (err) {
    console.warn(`[Step 2] Groq copywriting failed: ${err.message}. Falling back to Gemini...`);
    let retries = 5;
    let success = false;
    while (retries > 0 && !success) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          }),
          120000, // 2-min timeout for Gemini
          'Gemini generateContent'
        );
        text = response.text;
        success = true;
      } catch (geminiErr) {
        if (geminiErr.status === 429 || geminiErr.message.includes('429') || geminiErr.message.includes('quota') || geminiErr.message.includes('exhausted')) {
          console.log(`[Step 2] Gemini copywriting rate limited, sleeping 20s (retries left: ${retries - 1})...`);
          await new Promise(r => setTimeout(r, 20000));
          retries--;
        } else {
          console.error(`[Step 2] Gemini copywriting failed with non-rate-limit error:`, geminiErr.message);
          throw geminiErr;
        }
      }
    }
    if (!success) {
      throw new Error('Gemini copywriting failed permanently due to persistent rate limiting.');
    }
  }

  const copy = JSON.parse(text);

  // Programmatic fallback for testimonials if they are missing or empty
  if (!copy.testimonials || !Array.isArray(copy.testimonials) || copy.testimonials.length === 0) {
    console.log('[Step 2] Testimonials were empty. Populating programmatic fallback testimonials.');
    const bizType = String(researchData.category || '').toLowerCase();
    
    if (bizType.includes('restaurant') || bizType.includes('food') || bizType.includes('dhaba') || bizType.includes('cafe')) {
      copy.testimonials = [
        { text: `Absolutely delicious food! The flavors are incredibly authentic and the service was warm and welcoming.`, reviewer: 'Aman S.', rating: 5 },
        { text: `Best meal we have had in a long time. Generous portions, reasonable prices, and wonderful hospitality.`, reviewer: 'Rajesh K.', rating: 5 },
        { text: `A great place for family dining. The atmosphere is comfortable and everything we ordered was freshly prepared.`, reviewer: 'Priya M.', rating: 5 }
      ];
    } else if (bizType.includes('salon') || bizType.includes('spa') || bizType.includes('beauty')) {
      copy.testimonials = [
        { text: `Very professional staff and great ambiance. I got exactly the look I wanted. Highly recommend!`, reviewer: 'Neha G.', rating: 5 },
        { text: `Excellent customer service and top-notch styling. A truly premium experience.`, reviewer: 'Vikram S.', rating: 5 },
        { text: `Clean, modern, and very relaxing. The staff is highly skilled and attentive.`, reviewer: 'Simran K.', rating: 5 }
      ];
    } else if (bizType.includes('clinic') || bizType.includes('dent') || bizType.includes('doctor') || bizType.includes('health')) {
      copy.testimonials = [
        { text: `Wonderful doctors and friendly staff. They took the time to explain everything and made me feel very comfortable.`, reviewer: 'Rahul V.', rating: 5 },
        { text: `Extremely professional and clean facility. The treatment was seamless and highly effective.`, reviewer: 'Shweta D.', rating: 5 },
        { text: `Highly recommended clinic. Excellent care, modern equipment, and prompt service.`, reviewer: 'Anil P.', rating: 5 }
      ];
    } else {
      copy.testimonials = [
        { text: `Outstanding service and great quality. They went above and beyond to make sure we were satisfied.`, reviewer: 'Karan J.', rating: 5 },
        { text: `Highly professional team. The entire process was smooth, transparent, and completed on time.`, reviewer: 'Sonia R.', rating: 5 },
        { text: `A pleasure to work with. They deliver excellent results and represent great value.`, reviewer: 'Rohan B.', rating: 5 }
      ];
    }
  }

  // Programmatic fallback for FAQs if they are missing or empty
  if (!copy.faqs || !Array.isArray(copy.faqs) || copy.faqs.length === 0) {
    console.log('[Step 2] FAQs were empty. Populating programmatic fallback FAQs.');
    const bizHours = researchData.hours || 'our regular business hours';
    const bizAddress = researchData.address || 'our main location';
    copy.faqs = [
      { q: `What are your operating hours?`, a: `We are open during the following hours: ${bizHours}.` },
      { q: `Where are you located?`, a: `You can find us at ${bizAddress}.` },
      { q: `How can I contact you?`, a: `Please contact us directly for reservations or general inquiries.` },
      { q: `Do you offer standard services?`, a: `Yes, we offer a full range of services tailored to your needs. Please visit our services section above.` },
      { q: `How can I make a booking?`, a: `You can make a booking or inquiry directly through the contact details on our website.` }
    ];
  }

  console.log(`[Step 2] Copy generation complete.`);
  return copy;
}

module.exports = { generateCopy };
