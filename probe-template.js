require('dotenv').config();
const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('./templates/healthcare-dental/index.html', 'utf8');
const $ = cheerio.load(html);

console.log('=== LOGO/HEADER ===');
console.log('h1.display-xl count:', $('h1.display-xl').length, '| text:', $('h1.display-xl').text().slice(0,80));
console.log('p.lead count:', $('p.lead').length, '| text:', $('p.lead').first().text().slice(0,80));
console.log('a.nav-logo count:', $('a.nav-logo').length);
console.log('.logo span count:', $('.logo span').length, '| text:', $('.logo span').first().text().slice(0,50));
console.log('header a count:', $('header a').length, '| first:', $('header a').first().text().slice(0,50));
console.log('.logo count:', $('.logo').length, '| inner:', $('.logo').first().text().slice(0,60));

console.log('\n=== SERVICES ===');
console.log('.feature-card count:', $('.feature-card').length);
console.log('.service-card count:', $('.service-card').length);
console.log('#services .card count:', $('#services .card').length);
console.log('#services h3 count:', $('#services h3').length, '| first:', $('#services h3').first().text().slice(0,50));
console.log('#services .card p count:', $('#services .card p').length);

console.log('\n=== PHILOSOPHY / ABOUT ===');
console.log('#about h2 count:', $('#about h2').length, '| text:', $('#about h2').first().text().slice(0,60));
console.log('.philosophy-item count:', $('.philosophy-item').length);
console.log('.philosophy-item h3 count:', $('.philosophy-item h3').length, '| first:', $('.philosophy-item h3').first().text().slice(0,60));

console.log('\n=== TEAM ===');
console.log('section.section-bg-card .card count:', $('section.section-bg-card .card').length);
console.log('section.section-bg-card h3 count:', $('section.section-bg-card h3').length, '| first:', $('section.section-bg-card h3').first().text().slice(0,60));

console.log('\n=== TESTIMONIALS ===');
console.log('.testimonial-card count:', $('.testimonial-card').length);
console.log('.testimonial-quote count:', $('.testimonial-quote').length);
console.log('.testimonial-author count:', $('.testimonial-author').length);

console.log('\n=== FOOTER ===');
console.log('footer .footer-col count:', $('footer .footer-col').length);

console.log('\n=== TOP BAR ===');
console.log('.top-bar-contact text:', $('.top-bar-contact').text().trim().slice(0,100));
