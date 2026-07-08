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

  console.log(`[Step 3] Selected template based on type '${type}' and title '${title}': ${selected}`);
  return selected;
}

module.exports = { selectTemplate };
