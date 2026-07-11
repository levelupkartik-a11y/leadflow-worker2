const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEMPLATES = [
  { id: 'healthcare-dental', description: 'Clinics, doctors, dentists, healthcare' },
  { id: 'beauty and salon', description: 'Salons, spas, barbershops, beauty' },
  { id: 'realestate', description: 'Real estate, property management, builders' },
  { id: 'New folder (4)', description: 'Restaurants, cafes, bakeries, food services' },
  { id: 'New folder (5)', description: 'Generalist fallback template for anything else' }
];

async function selectTemplate(researchData, copyData) {
  const rawType = researchData.type || researchData.category || '';
  const type = (Array.isArray(rawType) ? rawType.join(' ') : String(rawType)).toLowerCase();
  const title = (researchData.title || researchData.name || '').toLowerCase();
  const description = researchData.description || '';

  // 1. Try Gemini classification for smart template selection
  const prompt = `
You are an expert systems classifier. Your job is to select the most appropriate website template ID for the following business based on its title, category, and description.

**Business Information:**
Title: ${researchData.title || researchData.name || ''}
Category: ${rawType}
Description: ${description}

**Available Templates (Select EXACTLY one of these IDs):**
1. "healthcare-dental": Use for clinics, doctors, dentists, medical care, therapy, wellness clinics, hospitals, pharmacies.
2. "beauty and salon": Use for hair salons, nail salons, beauty salons, spas, barbershops, personal styling, cosmetics.
3. "realestate": Use for real estate agents, property management, builders, brokers.
4. "New folder (4)": Use for restaurants, cafes, bakeries, bars, dhabas, food delivery, catering, and other food/beverage services.
5. "New folder (5)": Generalist fallback template for anything else that does not fit any of the 4 specific categories above (e.g. retail shops, plumbing, electrical, construction, automotive, cleaning, logistics, manufacturing, AND professional services like lawyers, law firms, consultants, financial/tax advisors, notaries).

Return ONLY a JSON object with a single key "selected_template" containing the selected template ID.
Do not output any markdown formatting, explanation, or extra keys.
Output format: {"selected_template": "New folder (5)"}
`;

  try {
    if (process.env.GEMINI_API_KEY) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text.trim());
      const selected = result.selected_template;
      if (TEMPLATES.some(t => t.id === selected)) {
        console.log(`[Step 3] Gemini selected template: ${selected}`);
        return selected;
      }
    }
  } catch (err) {
    console.error('[Step 3] Gemini template selection failed, falling back to local logic:', err.message);
  }

  // 2. Fallback to local regex-based logic
  let selected = 'New folder (5)'; // Generalist fallback is the default
  if (type.includes('restaurant') || type.includes('cafe') || type.includes('food') || type.includes('bakery') || type.includes('beverage') || type.includes('dhaba') || title.includes('restaurant') || title.includes('dhaba') || title.includes('cafe')) {
    selected = 'New folder (4)';
  } else if (type.includes('clinic') || type.includes('dentist') || type.includes('doctor') || type.includes('health') || type.includes('medical') || type.includes('hospital') || title.includes('clinic') || title.includes('dental') || title.includes('hospital')) {
    selected = 'healthcare-dental';
  } else if (type.includes('real estate') || type.includes('property') || type.includes('builder') || type.includes('reaty') || title.includes('real estate') || title.includes('properties') || title.includes('realty')) {
    selected = 'realestate';
  } else if (type.includes('salon') || type.includes('spa') || type.includes('barber') || type.includes('beauty') || type.includes('hair') || title.includes('salon') || title.includes('spa') || title.includes('barber')) {
    selected = 'beauty and salon';
  }

  console.log(`[Step 3] Selected template (local fallback) based on type '${type}' and title '${title}': ${selected}`);
  return selected;
}

module.exports = { selectTemplate };
