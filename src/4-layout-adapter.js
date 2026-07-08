const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function adaptLayout(templateId, copyData, buildDir, researchData) {
  console.log(`[Step 4] Adapting layout for template: ${templateId}`);
  
  // Find all HTML files in the buildDir (which is a copy of the selected template)
  const files = fs.readdirSync(buildDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const filePath = path.join(buildDir, file);
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    console.log(`Adapting ${file}...`);

    const prompt = `
You are an expert front-end developer and web designer. Your task is to adapt an existing HTML template to fit a new business's custom copy.

**Business Raw Data:**
Phone: ${researchData.phone}
Hours: ${researchData.hours}
Address: ${researchData.address}

**Generated Copy Data (JSON):**
${JSON.stringify(copyData, null, 2)}

**Instructions:**
- Here is the HTML source for "${file}".
- Adapt the structure to perfectly fit the generated copy.
- DO NOT just insert text into fixed slots. Expand, condense, reorder, or resize sections to emphasize standout traits.
- Minimize or remove sections that don't apply (e.g., if there are no team members in the copy, remove the team section).
- CRITICAL: Remove all generic template footer links (e.g., "Careers", "Sustainability", "Privacy Policy", "Terms of Service"). This is a simple local business site, so keep the footer minimalistic.
- CRITICAL: Ensure the business Phone Number, Operating Hours, and Address from the **Business Raw Data** above are prominently displayed, usually in the Header and/or Footer, and any "Contact Us" sections.
- CRITICAL: Look for the Testimonials section (usually just before the footer). Map the \`testimonials\` array from the Copy Data into testimonial cards. Duplicate or remove the placeholder cards so the number of cards matches the number of testimonials exactly. If there are no testimonials in the Copy Data, completely remove the Testimonials section. Do not leave placeholder text. Populate the \`text\`, \`reviewer\`, and \`rating\` (by duplicating star icons or adjusting rating numbers).
- Keep all original CSS classes (e.g. Tailwind, Bootstrap, or custom classes) intact so the styling remains consistent.
- Identify all image elements (\`<img>\`, or background images inline) and ensure they have a descriptive \`id\` attribute (like \`id="img-hero"\` or \`id="img-service-1"\`) so our Image Pipeline can process them in the next step. Add these IDs if missing.
- Return ONLY the final, complete, and valid HTML code. Do not wrap in markdown \`\`\`html tags, just output the raw HTML.

**Original HTML:**
${htmlContent}
`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      let newHtml = response.text;
      // Strip markdown backticks if Gemini includes them anyway
      if (newHtml.startsWith('\`\`\`html')) {
        newHtml = newHtml.replace(/^\`\`\`html/, '').replace(/\`\`\`$/, '');
      }
      
      fs.writeFileSync(filePath, newHtml.trim(), 'utf8');
      console.log(`Successfully adapted ${file}`);
    } catch (err) {
      console.error(`Failed to adapt ${file}:`, err.message);
    }
  }

  console.log('[Step 4] Layout adaptation complete.');
}

module.exports = { adaptLayout };
