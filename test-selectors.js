const fs = require('fs');
const cheerio = require('cheerio');

function testSelectors(file, selectors) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html);
  
  console.log(`\n--- ${file} ---`);
  for (const [key, sel] of Object.entries(selectors)) {
    const el = typeof sel === 'function' ? sel($) : $(sel);
    if (!el || el.length === 0) {
      console.log(`❌ ${key} (${typeof sel === 'function' ? 'func' : sel}): NOT FOUND`);
    } else {
      console.log(`✅ ${key}: Found ${el.length} elements. First text: "${el.first().text().replace(/\s+/g, ' ').substring(0, 50)}"`);
    }
  }
}

const configs = {
  'templates/beauty and salon/index.html': {
    heroTitle: 'h1',
    heroSubhead: 'h1 + p',
    businessName: 'a[href="#"]',
    servicesCards: '.grid-3 > div:not(.testimonial-card)',
    serviceTitle: $ => $('.grid-3 > div:not(.testimonial-card) h3'),
    serviceDesc: $ => $('.grid-3 > div:not(.testimonial-card) p'),
    testimonialCards: '.testimonial-card',
    testimonialQuote: '.testimonial-card p',
    testimonialAuthor: '.testimonial-card .author-name, .testimonial-card h4',
    footerContact: 'footer .grid-4 > div:nth-child(2), footer > div > div:nth-child(2)'
  },
  'templates/healthcare-dental/index.html': {
    heroTitle: 'h1',
    heroSubhead: 'h1 + p, .lead',
    businessName: 'a.nav-logo, a[href="#"]',
    servicesCards: '.feature-card, .service-card',
    serviceTitle: $ => $('.feature-card h3, .service-card h3'),
    serviceDesc: $ => $('.feature-card p, .service-card p'),
    testimonialCards: '.testimonial-card',
    testimonialQuote: '.testimonial-quote',
    testimonialAuthor: '.testimonial-author',
    footerContact: 'footer .col:nth-child(2)'
  },
  'templates/New folder (4)/index.html': {
    heroTitle: 'h1.reveal',
    heroSubhead: 'h1.reveal + p',
    businessName: 'a.font-display-lg',
    servicesCards: 'section:eq(1) .grid > div',
    serviceTitle: $ => $('section:eq(1) .grid > div h3'),
    serviceDesc: $ => $('section:eq(1) .grid > div p'),
    testimonialCards: 'section:eq(2) .bg-surface-container-lowest, section:eq(2) .border-outline-variant',
    testimonialQuote: $ => $('section:eq(2) .bg-surface-container-lowest p, section:eq(2) .border-outline-variant p'),
    testimonialAuthor: $ => $('section:eq(2) .bg-surface-container-lowest .text-on-surface-variant, section:eq(2) .border-outline-variant .text-on-surface-variant'),
    footerContact: 'footer .grid > div:nth-child(2)'
  },
  'templates/realestate/index.html': {
    heroTitle: 'h1',
    heroSubhead: 'h1 + p',
    businessName: 'a[href="#"]',
    servicesCards: '.property-card, .service-card, .grid > div',
    serviceTitle: $ => $('.property-card h3, .service-card h3, .grid > div h3'),
    serviceDesc: $ => $('.property-card p, .service-card p, .grid > div p'),
    testimonialCards: '.testimonial-card, section:contains("Testimonial") .grid > div',
    testimonialQuote: '.testimonial-card p',
    testimonialAuthor: '.testimonial-card h4, .testimonial-card .author',
    footerContact: 'footer .grid > div:nth-child(2)'
  }
};

for (const [file, selectors] of Object.entries(configs)) {
  try {
    testSelectors(file, selectors);
  } catch(e) {
    console.error(`Failed ${file}: ${e.message}`);
  }
}
