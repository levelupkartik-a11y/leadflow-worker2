const fs = require('fs');
const cheerio = require('cheerio');

const paths = [
  'templates/index.html',
  'templates/beauty and salon/index.html',
  'templates/healthcare-dental/index.html',
  'templates/New folder (4)/index.html',
  'templates/realestate/index.html'
];

for (const p of paths) {
  try {
    const html = fs.readFileSync(p, 'utf8');
    const $ = cheerio.load(html);
    console.log(`\n--- ${p} ---`);
    console.log('Hero Headline:', $('h1').first().attr('class') || 'No class');
    console.log('Hero Subhead:', $('h1').first().next('p').attr('class') || 'No next p');
    
    // Services
    let services = [];
    $('h3').each((i, el) => {
       const text = $(el).text().trim();
       if (text && services.length < 3) services.push(text);
    });
    console.log('H3s (likely services):', services);

    // Testimonials
    const testQuotes = $('.testimonial-card p, .testimonial-quote, .bg-surface-container-lowest p').length;
    const testAuthors = $('.testimonial-author, .testimonial-name, .text-on-surface-variant').length;
    console.log('Testimonials blocks:', testQuotes, 'Authors:', testAuthors);
  } catch (e) {
    console.error(e.message);
  }
}
