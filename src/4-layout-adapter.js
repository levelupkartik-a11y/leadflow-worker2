const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function simplifyHours(hoursStr) {
  if (!hoursStr) return 'Open Daily';
  const lower = hoursStr.toLowerCase();
  if (lower.includes('open 24 hours') || lower.includes('open 24/7')) {
    return 'Open 24 Hours';
  }
  // If it's a long list of days, summarize it
  if (hoursStr.includes(', ')) {
    const parts = hoursStr.split(', ');
    if (parts.length >= 5) {
      // Check if they all have the same hours
      const times = parts.map(p => p.split(': ')[1]).filter(Boolean);
      const uniqueTimes = [...new Set(times)];
      if (uniqueTimes.length === 1) {
        return `Daily: ${uniqueTimes[0]}`;
      }
      // Otherwise return a shorter version
      return `${parts[0]}...`;
    }
  }
  return hoursStr;
}

// ---------------------------------------------------------------------------
// extractDisplayName — pure, build-time only, NOT persisted
// Cleans SEO-stuffed Google Maps business names for use in UI (nav/header/
// footer). The original raw name is never modified in storage.
// ---------------------------------------------------------------------------
function extractDisplayName(rawName) {
  if (!rawName) return rawName;
  let name = rawName.trim();

  // 1. Pipe split: "Nnew Smile Clinic | Dr. Deepika Gupta | Best Dental..."
  //    → take only the first segment.
  if (name.includes('|')) {
    name = name.split('|')[0].trim();
  }

  // 2. Hyphen stripping: strip everything from the first hyphen onward
  //    ONLY when what follows reads like a marketing/SEO phrase.
  //    Genuine hyphenated names (e.g. "Coffee-House") are left intact.
  const SEO_TRIGGER_WORDS = [
    'best', 'top', '#1', 'no.1', 'no1', 'near me', 'near you',
    'rated', 'award', 'premium', 'leading', 'trusted', 'gym',
    // common Indian cities & localities
    'chandigarh', 'delhi', 'mumbai', 'bangalore', 'bengaluru',
    'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad',
    'jaipur', 'lucknow', 'surat', 'noida', 'gurgaon', 'gurugram',
    'mohali', 'panchkula', 'tricity',
  ];
  const hyphenIdx = name.indexOf('-');
  if (hyphenIdx > 0) {
    const afterHyphen = name.substring(hyphenIdx + 1).toLowerCase().trim();
    const isSEO = SEO_TRIGGER_WORDS.some(w => afterHyphen.includes(w));
    if (isSEO) name = name.substring(0, hyphenIdx).trim();
  }

  // 3. Strip trailing location / SEO appendages still present after step 1-2:
  //    "... in Chandigarh", "... - Chandigarh"
  name = name.replace(/\s+in\s+[A-Z][a-zA-Z\s,]+$/i, '').trim();
  name = name.replace(/\s*[-–]\s*[A-Z][a-zA-Z\s]+$/, '').trim();

  // 4. Purge any remaining standalone SEO words.
  const SEO_STANDALONE = ['best', 'top', '#1', 'near me', 'near you'];
  const cleaned = name
    .split(/\s+/)
    .filter(w => !SEO_STANDALONE.includes(w.toLowerCase()))
    .join(' ');
  if (cleaned.length > 0) name = cleaned;

  // 5. Hard cap at 6 words — anything longer is still stuffed.
  const words = name.split(/\s+/);
  if (words.length > 6) name = words.slice(0, 6).join(' ');

  return name.trim();
}

async function adaptLayout(templateId, copyData, buildDir, researchData) {
  console.log(`[Step 4] Adapting layout for template: ${templateId}`);
  
  // Find all HTML files in the buildDir (which is a copy of the selected template)
  const files = fs.readdirSync(buildDir);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const filePath = path.join(buildDir, file);
    let htmlContent = fs.readFileSync(filePath, 'utf8');

    console.log(`Adapting ${file}...`);

    try {
      const cheerio = require('cheerio');
      const $ = cheerio.load(htmlContent);
      
      // Compute display name once — never persisted, used only for UI slots.
      const displayName = extractDisplayName(researchData.title || researchData.name);

      switch (templateId) {
        case 'New folder (4)':
        case 'New folder (5)':
          // --- Brand / Name replacement ---
          if (displayName) {
            const bizName = displayName;
            $('.font-display-lg, span:contains("Culinary Craft"), a:contains("Culinary Craft")').text(bizName);
          }

          // --- Hero Section ---
          if (copyData.headline) {
            $('h1.reveal').text(copyData.headline);
          }
          if (copyData.about_section) {
            $('h1.reveal').next('p').text(copyData.about_section);
          }
          // Remove floating badge if not restaurant category
          const categoryLower = (Array.isArray(researchData.category) ? researchData.category.join(' ') : String(researchData.category || '')).toLowerCase();
          const isFood = categoryLower.includes('food') || categoryLower.includes('restaurant') || categoryLower.includes('dining') || categoryLower.includes('cafe') || categoryLower.includes('dhaba');
          if (!isFood) {
            $('.reveal.inline-flex.items-center.gap-2').remove();
            $('a:contains("Recipes"), a:contains("recipes")').text('Services');
            $('a:contains("Recipes")').attr('href', '#seasonal');
          } else {
            // Customize badge attributes
            if (researchData.attributes && researchData.attributes.length > 0) {
              $('.reveal.inline-flex span:last-child').text(researchData.attributes.slice(0, 3).join(', '));
            }
          }

          // CTA Button
          const ctaText = copyData.cta || (isFood ? 'Browse Menu' : 'Explore Services');
          $('a:contains("Browse Recipes")').text(ctaText);

          // --- Services Section (Seasonal Favorites bento) ---
          const seasonalHeader = $('#seasonal');
          if (copyData.services && copyData.services.length > 0) {
            seasonalHeader.find('h2').text(isFood ? 'Seasonal Favorites' : 'Featured Services');
            seasonalHeader.find('p').first().text(isFood ? 'Handpicked selections that celebrate the flavors of the current harvest.' : 'Explore our professional services and custom solutions.');
            
            const serviceCardsRest = seasonalHeader.find('.grid').first().find('article');
            serviceCardsRest.each((i, el) => {
              const svc = copyData.services[i];
              if (svc) {
                const h3 = $(el).find('h3');
                const p = $(el).find('p');
                if (h3.length) h3.text(svc.name);
                if (p.length) p.text(svc.description);
                $(el).find('img').attr('alt', svc.name);

                // Update category tag
                const tags = $(el).find('span');
                if (tags.length > 0) {
                  tags.eq(0).text(svc.name.split(' ')[0]);
                  if (tags.length > 1) {
                    tags.eq(1).text('Featured');
                  }
                }
              } else {
                $(el).remove(); // Prune extra bento grid articles
              }
            });
          } else {
            seasonalHeader.remove();
          }

          // --- Philosophy Section (Rooted in Nature) ---
          const philSection = $('section:contains("Rooted in Nature")');
          if (philSection.length) {
            philSection.find('h2').text(isFood ? 'Rooted in Nature' : 'Our Philosophy');
            if (copyData.about_section) {
              philSection.find('p').text(copyData.about_section);
            }
          }

          // --- Testimonials ---
          const testimonialSectionRest = $('section:contains("What Our Guests Say")');
          if (copyData.testimonials && copyData.testimonials.length > 0) {
            testimonialSectionRest.find('h2').text('Client Testimonials');
            testimonialSectionRest.find('p').first().text('Read genuine feedback from our clients.');
            
            const testCards = testimonialSectionRest.find('.grid').first().find('> div');
            testCards.each((i, el) => {
              const t = copyData.testimonials[i];
              if (t) {
                $(el).find('p').first().text(`"${t.text}"`);
                $(el).find('h4').text(t.reviewer);
                $(el).find('h4').siblings('span').text('Verified Client');
                
                // Update avatar initials
                const avatar = $(el).find('.w-10.h-10');
                if (avatar.length && t.reviewer) {
                  avatar.text(t.reviewer.trim().charAt(0).toUpperCase());
                }
              } else {
                $(el).remove();
              }
            });
          } else {
            testimonialSectionRest.remove();
          }

          // --- Footer Contact column & details ---
          const footerColsRest = $('footer .grid > div');
          if (footerColsRest.length > 1) {
            const footerContactRest = footerColsRest.eq(1);
            const cleanHours = simplifyHours(researchData.hours);
            footerContactRest.html(`
              <h4 class="font-label-lg text-label-lg mb-6 text-on-surface font-bold uppercase tracking-wider">Contact Us</h4>
              <ul class="space-y-4 font-body-md text-body-md text-on-surface-variant" style="list-style: none; padding: 0;">
                ${researchData.address ? `<li>📍 ${researchData.address}</li>` : ''}
                ${researchData.phone ? `<li>📞 ${researchData.phone}</li>` : ''}
                ${cleanHours ? `<li>🕒 ${cleanHours}</li>` : ''}
              </ul>
            `);
          }

          // --- Why Choose Us Section ---
          const cityRest = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh' : 'Chandigarh';
          const categoryVal = Array.isArray(researchData.category)
            ? researchData.category.join(' ')
            : (researchData.category || 'Fine Dining');
          const cuisineRest = categoryVal.split('&')[0].trim();
          
          const whyTitle1 = isFood ? 'Fresh Ingredients' : 'Quality Service';
          const whyDesc1 = isFood ? 'Sourced locally and prepared fresh daily for the finest taste.' : 'Professional standards and attention to details.';
          
          const whyTitle2 = isFood ? `${cuisineRest} Cuisine` : 'Custom Solutions';
          const whyDesc2 = isFood ? `Authentic recipes celebrating the best of ${cuisineRest.toLowerCase()} tradition.` : 'Tailored packages matching your exact personal requirements.';
          
          const whyTitle3 = 'Trusted Standards';
          const whyDesc3 = `Providing top-rated hospitality and care in ${cityRest}.`;
          
          const whyTitle4 = isFood ? 'Dine-in & Delivery' : 'Flexible Booking';
          const whyDesc4 = isFood ? 'Enjoy our dishes in our cozy dining area or at your home.' : 'Convenient online scheduling and flexible hours.';

          $('.why-title-1').text(whyTitle1); $('.why-desc-1').text(whyDesc1);
          $('.why-title-2').text(whyTitle2); $('.why-desc-2').text(whyDesc2);
          $('.why-title-3').text(whyTitle3); $('.why-desc-3').text(whyDesc3);
          $('.why-title-4').text(whyTitle4); $('.why-desc-4').text(whyDesc4);

          // --- Location & Hours Map Section ---
          if (researchData.address) {
            $('#location-address-text').text(researchData.address);
            $('#locality-serving-text').text(`Serving ${cityRest} and surrounding areas`);
            
            const mapQuery = encodeURIComponent(`${researchData.title || researchData.name} ${researchData.address}`);
            const mapUrl = process.env.MAPS_API_KEY 
              ? `https://www.google.com/maps/embed/v1/place?key=${process.env.MAPS_API_KEY}&q=${mapQuery}`
              : `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
            $('#map-embed-iframe').attr('src', mapUrl);
          }

          if (researchData.hours) {
            const hoursList = researchData.hours.split(',').map(h => h.trim()).filter(Boolean);
            if (hoursList.length > 0) {
              let rowsHtml = '';
              hoursList.forEach(item => {
                const index = item.indexOf(': ');
                if (index !== -1) {
                  const day = item.substring(0, index);
                  const time = item.substring(index + 2);
                  rowsHtml += `<tr class="border-b border-outline-variant/10"><td class="p-3 font-bold text-deep-espresso">${day}</td><td class="p-3 text-right">${time}</td></tr>`;
                }
              });
              if (rowsHtml) {
                $('#hours-table-container tbody').html(rowsHtml);
              }
            }
          }

          // Footer brand Column
          const footerBrandCol = footerColsRest.eq(0);
          if (footerBrandCol.length) {
            footerBrandCol.find('span.font-display-lg').text(displayName);
            if (copyData.about_section) {
              footerBrandCol.find('p').first().text(String(copyData.about_section).substring(0, 150) + '...');
            }
            footerBrandCol.find('p').last().text(`© ${new Date().getFullYear()} ${displayName}. All Rights Reserved.`);
          }
          break;

        case 'healthcare-dental':
          // --- Business name: .logo span (a.nav-logo does NOT exist in this template) ---
          if (displayName) {
            $('.logo span').text(displayName);
            // Also update the logo letter initial
            $('.logo-icon').text((displayName || 'A')[0].toUpperCase());
          }

          // --- Top announcement bar contact info ---
          if ($('.top-bar-contact').length) {
            const cleanHours = simplifyHours(researchData.hours);
            $('.top-bar-contact').html(
              `<span>📍 ${researchData.address || ''}</span>` +
              (researchData.phone ? `<span>📞 ${researchData.phone}</span>` : '') +
              (cleanHours ? `<span>🕒 ${cleanHours}</span>` : '')
            );
          }

          // --- Hero headline & tagline ---
          if (copyData.headline) {
            // Strip line-break styling — just set plain text
            $('h1.display-xl').text(copyData.headline);
          }
          if (copyData.tagline && $('p.lead').length) {
            $('p.lead').first().text(copyData.tagline);
          } else if (copyData.about_section && $('p.lead').length) {
            $('p.lead').first().text(copyData.about_section);
          }

          // --- Hero floating badge: remove template-specific "Biomimetic Care" badge ---
          $('.floating-badge').remove();

          // --- About / Philosophy section ---
          if (copyData.about_section) {
            if ($('#about h2').length) $('#about h2').first().text(String(copyData.about_section || '').slice(0, 80));
            if ($('.philosophy-sticky p').length) $('.philosophy-sticky p').first().text(String(copyData.about_section || ''));
          }
          if (copyData.services && copyData.services.length > 0) {
            $('.philosophy-item').each((i, el) => {
              const svc = copyData.services[i];
              if (svc) {
                $(el).find('h3').text(svc.name);
                $(el).find('p').text(svc.description);
                $(el).find('.philosophy-number').text(`0${i + 1} / ${svc.name.toUpperCase()}`);
              } else {
                $(el).remove();
              }
            });
          } else {
            $('#about').remove();
          }

          // --- Services grid ---
          if (copyData.services && copyData.services.length > 0) {
            $('#services .card').each((i, el) => {
              const svc = copyData.services[i];
              if (svc) {
                $(el).find('.label-caps').text(svc.name.split(' ').slice(0, 2).join(' ').toUpperCase());
                $(el).find('h3').text(svc.name);
                $(el).find('p').first().text(svc.description);
                $(el).find('img').attr('alt', svc.name);
              } else {
                $(el).remove();
              }
            });
          } else {
            $('#services').remove();
          }

          // --- Booking form cleanups ---
          if ($('#serviceType').length && copyData.services && copyData.services.length > 0) {
            let optionsHtml = '<option value="">-- Select Service --</option>';
            copyData.services.forEach(svc => {
              optionsHtml += `<option value="${svc.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}">${svc.name}</option>`;
            });
            $('#serviceType').html(optionsHtml);
          }
          if ($('#notes').length) {
            $('#notes').attr('placeholder', 'Let us know if you have any specific concerns, booking preferences, or requests...');
          }

          // --- Dynamic FAQ rewriting ---
          const faqItems = $('.accordion-item');
          if (faqItems.length > 0) {
            try {
              console.log('[Step 4] Generating relevant FAQs dynamically using Groq...');
              const faqPrompt = `
You are an expert copywriter for ${researchData.title}, a ${researchData.category} located at ${researchData.address}.
Write 4 highly relevant, realistic FAQ questions and answers matching this specific business and its service offerings.
If it is a general medical clinic/hospital, write general medical/clinic FAQs. Do NOT include dental, teeth, aligners, or crowns unless the business category explicitly contains "dental" or "dentist".

Format the output strictly as a JSON object with a single key "faqs" containing an array of objects:
{
  "faqs": [
    { "q": "Question text?", "a": "Answer text. Keep it to 1-2 helpful sentences." }
  ]
}
`;
              const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'llama-3.1-8b-instant',
                  messages: [{ role: 'user', content: faqPrompt }],
                  response_format: { type: 'json_object' }
                })
              });
              const groqJson = await groqRes.json();
              if (groqRes.ok) {
                const parsed = JSON.parse(groqJson.choices[0].message.content);
                const list = parsed.faqs || [];
                faqItems.each((i, el) => {
                  const faq = list[i];
                  if (faq) {
                    $(el).find('.accordion-header span').text(faq.q);
                    $(el).find('.accordion-body p').text(faq.a);
                  } else {
                    $(el).remove();
                  }
                });
              }
            } catch (faqErr) {
              console.warn('Failed to rewrite FAQs dynamically, keeping default or hiding section.', faqErr.message);
            }
          }

          // --- Team section: OMIT ENTIRELY if no real staff data ---
          {
            const teamMembers = copyData.team_members || [];
            const teamSection = $('section.section-bg-card');
            if (teamMembers.length === 0) {
              teamSection.remove();
              console.log('[Step 4] No staff data found — team section removed.');
            } else {
              teamSection.find('.card').each((i, el) => {
                const member = teamMembers[i];
                if (member) {
                  $(el).find('.label-caps').text(member.role || '');
                  $(el).find('h3').text(member.name || '');
                  $(el).find('p').first().text(member.bio || '');
                  $(el).find('img').attr('alt', member.name);
                } else {
                  $(el).remove();
                }
              });
            }
          }

          // --- Testimonials ---
          if (copyData.testimonials && copyData.testimonials.length > 0) {
            $('.testimonial-card').each((i, el) => {
              const t = copyData.testimonials[i];
              if (t) {
                $(el).find('.testimonial-quote').text(`"${t.text}"`);
                $(el).find('.testimonial-author').text(t.reviewer);
              } else {
                $(el).remove();
              }
            });
          } else {
            $('.testimonial-card').closest('section').remove();
          }

          if ($('#services h2').length) {
            $('#services h2').first().text('Our Services & Treatments');
          }

          // --- Booking Section: Right Column Contact details ---
          const bookingRightCol = $('#booking').find('.reveal-up.delay-200');
          if (bookingRightCol.length) {
            const city = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || '' : '';
            bookingRightCol.find('h2.display-lg').text(city ? `Located in ${city}` : 'Contact & Location');
            
            const addrCard = bookingRightCol.find('.card').eq(0);
            if (addrCard.length) {
              addrCard.find('p').eq(0).text(displayName || '');
              addrCard.find('p').eq(1).html(researchData.address || '');
              addrCard.find('div').remove();
            }
            
            const contactCard = bookingRightCol.find('.card').eq(1);
            if (contactCard.length) {
              let contactHtml = '<h3 class="display-sm" style="margin-bottom: 12px; color: white;">📞 Direct Contact</h3>';
              if (researchData.phone) {
                contactHtml += `<p style="margin-bottom: 8px;"><strong>Main Line:</strong> <a href="tel:${researchData.phone.replace(/[^0-9+]/g, '')}" style="color: var(--accent-sage-light); font-weight: 600; text-decoration: underline;">${researchData.phone}</a></p>`;
              }
              contactCard.html(contactHtml);
            }
            
            const hoursCard = bookingRightCol.find('.card').eq(2);
            if (hoursCard.length) {
              const cleanHours = simplifyHours(researchData.hours);
              hoursCard.html(`
                <h3 class="display-sm" style="margin-bottom: 12px; color: white;">🕒 Hours of Operation</h3>
                <p style="color: rgba(255,255,255,0.9); font-weight: 500;">${cleanHours}</p>
              `);
            }
          }

          // --- Dynamic Google Map embed ---
          if ($('iframe[title*="Map"]').length && researchData.address) {
            const mapQuery = encodeURIComponent(`${researchData.title} ${researchData.address}`);
            $('iframe[title*="Map"]').attr('src', `https://maps.google.com/maps?q=${mapQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`);
          }

          // --- Footer contact column ---
          {
            const footerContactHealth = $('footer .footer-col').eq(1);
            if (footerContactHealth.length) {
              const cleanHours = simplifyHours(researchData.hours);
              footerContactHealth.html(`
                <h4 style="color: var(--text-main); margin-bottom: 24px;">Contact Us</h4>
                <ul style="list-style: none; padding: 0; margin: 0; color: var(--text-muted);">
                  ${researchData.address ? `<li style="margin-bottom: 12px;">📍 ${researchData.address}</li>` : ''}
                  ${researchData.phone ? `<li style="margin-bottom: 12px;">📞 ${researchData.phone}</li>` : ''}
                  ${cleanHours ? `<li style="margin-bottom: 12px;">🕒 ${cleanHours}</li>` : ''}
                </ul>
              `);
            }
          }

          // --- Footer brand name and description ---
          const footerColBrand = $('footer .footer-col').eq(0);
          if (footerColBrand.length) {
            if (copyData.about_section) {
              footerColBrand.find('p').text(copyData.about_section.substring(0, 150) + '...');
            }
            if (researchData.address) {
              footerColBrand.find('div').last().text(`📍 ${researchData.address}`);
            }
            footerColBrand.find('.logo span').text(displayName || '');
            footerColBrand.find('.logo .logo-icon').text((displayName || 'A')[0].toUpperCase());
          }

          // --- Footer Services Links ---
          const footerServicesCol = $('footer .footer-col').eq(2);
          if (footerServicesCol.length && copyData.services && copyData.services.length > 0) {
            let linksHtml = '<h4>Treatments</h4><ul class="footer-links" style="list-style: none; padding: 0; margin: 0;">';
            copyData.services.forEach(svc => {
              linksHtml += `<li style="margin-bottom: 12px;"><a href="#services" style="color: var(--text-muted); text-decoration: none;">${svc.name}</a></li>`;
            });
            linksHtml += '</ul>';
            footerServicesCol.html(linksHtml);
          }

          // --- Footer copyright ---
          $('footer .footer-bottom div').first().text(`© ${new Date().getFullYear()} ${displayName}. All Rights Reserved.`);
          break;


        case 'beauty and salon':
        case 'index':
          // --- Brand / Name replacement ---
          if (displayName) {
            const bizName = displayName;
            $('.nav-logo').html(`${bizName}<span style="color: var(--accent);">.</span>`);
          }

          // --- Hero Section ---
          if (copyData.headline) {
            $('h1.text-hero').text(copyData.headline);
          }
          if (copyData.about_section) {
            $('p.text-subtitle').first().text(copyData.about_section);
          }
          // Remove product-selling tags/badges
          $('.hero-badge-left').remove();
          $('.hero-tagline').html(`<span>✦</span> Professional Styling & Salon Rituals`);

          // --- Repurpose Shop into a Salon Work Gallery ---
          const shopSection = $('#shop');
          if (shopSection.length) {
            shopSection.attr('id', 'gallery');
            shopSection.find('.text-caption').text('Recent Work');
            shopSection.find('h2.text-h2').text('Signature Transformations');
            shopSection.find('.btn-outline').remove(); // Remove shop button

            // Repurpose product cards as gallery item cards
            const cards = shopSection.find('.product-card');
            const galleryTitles = [
              'Precision Cut & Styling',
              'Artisanal Color & Balayage',
              'Restorative Hair Rituals',
              'Signature Salon Sanctuary'
            ];
            const gallerySubtitles = [
              'Expert cuts tailored to your unique features and style',
              'Bespoke hand-painted highlights for natural dimension',
              'Clinical conditioning treatments for ultimate shine and health',
              'An ultra-premium sanctuary designed for timeless relaxation'
            ];

            cards.each((i, el) => {
              const card = $(el);
              card.removeClass('product-card').addClass('gallery-card');
              card.find('.product-badge').remove();
              card.find('.product-quick-view').remove();
              
              card.find('.product-category').text('Featured Work');
              card.find('.product-title').text(galleryTitles[i] || 'Signature Look');
              card.find('.text-subtitle').text(gallerySubtitles[i] || 'Experience premium salon care');
              card.find('.product-price-row').remove(); // Remove price and add-to-bag button
            });
          }
          $('.cart-overlay, .cart-drawer, .quickview-overlay, .quickview-modal, .cart-trigger').remove();

          // --- Ritual steps (Our Heritage / about section) ---
          if (copyData.services && copyData.services.length > 0) {
            $('.ritual-step').each((i, el) => {
              const svc = copyData.services[i];
              if (svc) {
                $(el).find('h3').text(svc.name);
                $(el).find('p').text(svc.description);
              } else {
                $(el).remove();
              }
            });
          } else {
            $('#about').remove();
          }

          // --- Services list (#services) ---
          const beautyServicesGrid = $('#services');
          if (copyData.services && copyData.services.length > 0) {
            beautyServicesGrid.find('h2.text-h2').text('Treatments & Services');
            const items = beautyServicesGrid.find('.treatment-item');
            items.each((i, el) => {
              const svc = copyData.services[i];
              if (svc) {
                $(el).find('h3').text(svc.name);
                $(el).find('p').first().text(svc.description);
                // Simplify booking link attribute
                $(el).find('button').attr('data-treatment', svc.name);
              } else {
                $(el).remove();
              }
            });
          } else {
            beautyServicesGrid.remove();
          }

          // --- Testimonials ---
          const testimonialSectionBeauty = $('.testimonial-card').first().closest('section');
          if (copyData.testimonials && copyData.testimonials.length > 0) {
            testimonialSectionBeauty.find('h2.text-h2').text('Sanctuary Praise');
            const cards = testimonialSectionBeauty.find('.testimonial-card');
            cards.each((i, el) => {
              const t = copyData.testimonials[i];
              if (t) {
                $(el).find('p.text-subtitle').text(`"${t.text}"`);
                $(el).find('.author-row p').first().text(t.reviewer);
                $(el).find('.author-row p').last().text('Verified Client');
                $(el).find('img.author-avatar').attr('alt', t.reviewer);
              } else {
                $(el).remove();
              }
            });
          } else {
            testimonialSectionBeauty.remove();
          }

          // --- Booking Wizard Modal Options ---
          if ($('#wizard-treatment-select').length && copyData.services && copyData.services.length > 0) {
            let optionsHtml = '';
            copyData.services.forEach((svc, idx) => {
              optionsHtml += `<option value="${idx}">${svc.name}</option>`;
            });
            $('#wizard-treatment-select').html(optionsHtml);
          }
          if ($('#wizard-therapist').length) {
            $('#wizard-therapist').html('<option value="any">First Available Stylist</option>');
          }
          if ($('#client-notes').length) {
            $('#client-notes').attr('placeholder', 'Please let us know any requests or scheduling requirements...');
          }

          // --- Footer contact columns ---
          const footerGridBeauty = $('.footer-grid');
          if (footerGridBeauty.length) {
            // Remove shop column
            footerGridBeauty.find('.footer-title:contains("Shop")').parent().remove();
            
            // Rewrite brand col
            const brandCol = footerGridBeauty.find('div').first();
            if (brandCol.length) {
              brandCol.find('a.nav-logo').html(`${displayName}<span style="color: var(--accent);">.</span>`);
              if (copyData.about_section) {
                brandCol.find('p.text-subtitle').text(String(copyData.about_section).substring(0, 160) + '...');
              }
            }

            // Rewrite services links
            const servicesCol = footerGridBeauty.find('.footer-title:contains("Sanctuary Menu")').parent();
            if (servicesCol.length && copyData.services && copyData.services.length > 0) {
              let linksHtml = '<h4 class="footer-title">Sanctuary Menu</h4><div class="footer-links" style="display: flex; flex-direction: column; gap: 8px;">';
              copyData.services.forEach(svc => {
                linksHtml += `<a href="#services" style="color: var(--text-light-muted); text-decoration: none;">${svc.name}</a>`;
              });
              linksHtml += '</div>';
              servicesCol.html(linksHtml);
            }

            // Rewrite contact info into column 3
            const newsletterCol = footerGridBeauty.find('.footer-title:contains("Inner Circle")').parent();
            if (newsletterCol.length) {
              const cleanHours = simplifyHours(researchData.hours);
              newsletterCol.html(`
                <h4 class="footer-title">Contact & Location</h4>
                <p style="color: var(--text-light-muted); font-size: 0.95rem; line-height: 1.6; margin-bottom: 8px;">
                  📍 ${researchData.address || ''}<br/>
                  📞 ${researchData.phone || ''}<br/>
                  🕒 ${cleanHours || 'Open Daily'}
                </p>
              `);
            }
          }

          // Footer bottom copyright
          $('footer .footer-bottom p').first().text(`© ${new Date().getFullYear()} ${displayName}. All Rights Reserved.`);
          break;


        case 'realestate':
          // --- Brand / Name replacement ---
          if ($('#header-logo').length) {
            $('#header-logo').replaceWith(`<span class="font-serif text-lg md:text-xl text-white font-semibold tracking-wider">${displayName}</span>`);
          }
          if ($('#mobile-drawer span.text-heritage-gold').length) {
            $('#mobile-drawer span.text-heritage-gold').text(displayName);
          }
          if ($('footer').length) {
            $('footer').find('.font-serif').first().text(displayName);
          }

          // --- Hero Section ---
          if (copyData.headline) {
            $('h1').first().text(copyData.headline);
          }
          if (copyData.about_section) {
            $('section').first().find('p.text-white\\/80').first().text(copyData.about_section);
          }
          
          // --- Properties Bento Cards Address Correction (Remove NJ leak) ---
          const propCards = $('.md\\:col-span-8, .md\\:col-span-4');
          propCards.each((i, el) => {
            const addr = $(el).find('p.text-sm');
            if (addr.length && researchData.address) {
              const city = researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh';
              addr.text(`Featured property listing in ${city}`);
            }
          });

          // --- Services list (Why Select section) ---
          const serviceCardsReal = $('section:contains("Why Select") .grid > div, section:contains("Signature Advantage") .grid > div');
          if (copyData.services && copyData.services.length > 0) {
            serviceCardsReal.each((i, el) => {
               const svc = copyData.services[i];
               if (svc) {
                  const h3 = $(el).find('h3');
                  const p = $(el).find('p');
                  if (h3.length) h3.text(svc.name);
                  if (p.length) p.text(svc.description);
               } else {
                  $(el).remove();
               }
            });
          }

          // --- Testimonials ---
          const testCardsReal = $('.testimonial-card, section:contains("What Our Clients Say") .grid > div');
          if (copyData.testimonials && copyData.testimonials.length > 0) {
            testCardsReal.each((i, el) => {
               const t = copyData.testimonials[i];
               if (t) {
                  const quote = $(el).find('p.italic');
                  const authorName = $(el).find('p.font-semibold, p.font-serif, h4');
                  const authorRole = $(el).find('p.text-xs, span.role');
                  if (quote.length) quote.text(`"${t.text}"`);
                  if (authorName.length) authorName.text(t.reviewer);
                  if (authorRole.length) authorRole.text('Verified Client');
               } else {
                  $(el).remove();
               }
            });
          }

          // --- Location & Hours Map Section ---
          if (researchData.address) {
            const cityReal = researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh';
            $('#location-address-text').text(researchData.address);
            $('#locality-serving-text').text(`Serving ${cityReal} and neighboring areas`);

            const mapQueryReal = encodeURIComponent(`${researchData.title || researchData.name} ${researchData.address}`);
            const mapUrlReal = process.env.MAPS_API_KEY
              ? `https://www.google.com/maps/embed/v1/place?key=${process.env.MAPS_API_KEY}&q=${mapQueryReal}`
              : `https://maps.google.com/maps?q=${mapQueryReal}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
            $('#map-embed-iframe').attr('src', mapUrlReal);
          }

          if (researchData.hours) {
            const hoursListReal = researchData.hours.split(',').map(h => h.trim()).filter(Boolean);
            if (hoursListReal.length > 0) {
              let rowsHtmlReal = '';
              hoursListReal.forEach(item => {
                const index = item.indexOf(': ');
                if (index !== -1) {
                  const day = item.substring(0, index);
                  const time = item.substring(index + 2);
                  rowsHtmlReal += `<tr class="border-b border-ink/5"><td class="p-3 font-semibold text-ink">${day}</td><td class="p-3 text-right">${time}</td></tr>`;
                }
              });
              if (rowsHtmlReal) {
                $('#hours-table-container tbody').html(rowsHtmlReal);
              }
            }
          }

          // --- Footer Details & Contact Column ---
          const footerNav = $('footer nav');
          if (footerNav.length) {
             const cleanHours = simplifyHours(researchData.hours);
             footerNav.nextAll().remove(); // Clean old contact widgets
             footerNav.after(`
               <div class="flex flex-col items-center gap-2 mt-8 text-center">
                 <h4 class="text-heritage-gold font-bold uppercase tracking-widest text-xs mb-2">Office & Contact</h4>
                 <p class="text-white/70 text-sm max-w-md">📍 ${researchData.address || ''}</p>
                 <p class="text-white/70 text-sm">📞 ${researchData.phone || ''}</p>
                 <p class="text-white/70 text-sm">🕒 ${cleanHours || 'Open Daily'}</p>
               </div>
             `);
          }
          break;
      }

      // SEO Metadata injection
      if (researchData.title) {
        $('title').text(`${researchData.title} | ${copyData.tagline || copyData.headline || 'Professional Services'}`);
      }
      if (copyData.about_section) {
        let metaDesc = $('meta[name="description"]');
        if (metaDesc.length === 0) {
          $('head').append('<meta name="description" content="">');
          metaDesc = $('meta[name="description"]');
        }
        metaDesc.attr('content', copyData.about_section.substring(0, 160));
      }

      const finalHtml = $.html();
      fs.writeFileSync(filePath, finalHtml, 'utf8');
      console.log(`Successfully adapted ${file} using dynamic Cheerio config`);
    } catch (err) {
      console.error(`Failed to adapt ${file}:`, err.message);
    }
  }

  console.log('[Step 4] Layout adaptation complete.');
}

module.exports = { adaptLayout };
