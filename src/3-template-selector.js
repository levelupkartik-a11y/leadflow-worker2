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
  console.log(`[Step 3] Selecting template for ${researchData.title}...`);
  
  // Prefer Groq if key exists, else Gemini
  if (process.env.GROQ_API_KEY) {
    try {
      return await selectWithGroq(researchData, copyData);
    } catch (err) {
      console.warn('Groq failed, falling back to Gemini...', err.message);
    }
  }

  const prompt = `
You must select the most fitting website template for a business.
Business Name: ${researchData.title}
Category: ${researchData.category}
Tone/Standout Traits: ${copyData.tone_summary}

Available Templates:
${TEMPLATES.map(t => `- ID: "${t.id}", Description: ${t.description}`).join('\n')}

Select the ID of the template that best fits this business. If it's a blended/edge case, use your judgment. If nothing fits well, select "New folder (5)" (Generalist).

Provide a JSON output exactly like this:
{
  "selected_template_id": "...",
  "reasoning": "..."
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    }
  });

  const selection = JSON.parse(response.text);
  console.log(`[Step 3] Selected template: ${selection.selected_template_id} - ${selection.reasoning}`);
  return selection.selected_template_id;
}

async function selectWithGroq(researchData, copyData) {
  const fetch = require('node-fetch');
  // Simple prompt for groq
  const prompt = `
Available Templates:
${TEMPLATES.map(t => `${t.id} (${t.description})`).join('\n')}

Business Name: ${researchData.title}
Category: ${researchData.category}
Tone: ${copyData.tone_summary}

Reply with ONLY a JSON object: {"selected_template_id": "...", "reasoning": "..."}
  `;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Groq error: ${JSON.stringify(json)}`);

  const selection = JSON.parse(json.choices[0].message.content);
  console.log(`[Step 3] Selected template (via Groq): ${selection.selected_template_id} - ${selection.reasoning}`);
  return selection.selected_template_id;
}

module.exports = { selectTemplate };
