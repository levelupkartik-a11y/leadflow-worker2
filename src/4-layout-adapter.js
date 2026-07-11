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
          
          // Use copyData.cuisine_or_business_type if available (cleanly rephrased by LLM)
          const cuisineRest = copyData.cuisine_or_business_type || categoryVal.split('&')[0].trim();
          
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
          }

          // Replace duplicate copyrights (e.g. Culinary Craft leaks)
          $('p:contains("Culinary Craft"), span:contains("Culinary Craft"), div:contains("Culinary Craft")').each((_, el) => {
            if ($(el).children().length === 0 || $(el).find('p').length === 0) {
              const text = $(el).text();
              $(el).text(text.replace(/Culinary Craft/g, displayName));
            }
          });
          break;

        case 'healthcare-dental':
          const city = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh' : 'Chandigarh';

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

          // Replace Seattle city leaks in metadata, reviews bar, and copy blocks
          $('meta[name="description"]').attr('content', (_, content) => content ? content.replace(/Seattle/g, city) : '');
          $('div:contains("verified patient reviews")').each((_, el) => {
            $(el).text($(el).text().replace(/Seattle/g, city));
          });
          $('p:contains("Seattle"), span:contains("Seattle"), h2:contains("Seattle")').each((_, el) => {
            if ($(el).closest('#booking').length === 0) {
              $(el).text($(el).text().replace(/Seattle/g, city));
            }
          });

          // Replace Chloe booking form persona reference with generic team wording
          $('p:contains("Chloe")').each((_, el) => {
            $(el).text($(el).text().replace(/Chloe, our patient concierge,/g, 'our team').replace(/Chloe/g, 'our team'));
          });

          // Remove the contradictory Office Hours column in footer and HIPAA compliance link
          $('footer .footer-col:contains("Office Hours")').remove();
          $('footer a:contains("HIPAA")').remove();

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
            const cityBooking = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || '' : '';
            bookingRightCol.find('h2.display-lg').text(cityBooking ? `Located in ${cityBooking}` : 'Contact & Location');
            
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
          const cityReal = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh' : 'Chandigarh';

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

          // --- Philosophy Section (Bio Section) ---
          const philSectionReal = $('span:contains("Our Philosophy")').closest('section');
          if (philSectionReal.length) {
            if (copyData.about_section) {
              philSectionReal.find('p').first().text(copyData.about_section);
            }
            const p2 = philSectionReal.find('p').eq(1);
            if (p2.length) {
              p2.text(p2.text()
                .replace(/Signature Realty NJ/g, displayName)
                .replace(/Signature Realty/g, displayName)
                .replace(/New Jersey/g, cityReal)
              );
            }
          }

          // Replace Why Select Signature Realty
          $('h2:contains("Signature Realty")').text(`Why Select ${displayName}`);
          
          // --- Properties Bento Cards Address Correction (Remove NJ leak) ---
          const propCardsReal = $('.md\\:col-span-8, .md\\:col-span-4');
          propCardsReal.each((i, el) => {
            const addr = $(el).find('p.text-sm');
            if (addr.length && researchData.address) {
              addr.text(`Featured property listing in ${cityReal}`);
            }
            // Replace image alt tags to prevent leaks
            const img = $(el).find('img');
            if (img.length) {
              const originalAlt = img.attr('alt') || '';
              if (originalAlt.includes('Edison') || originalAlt.includes('Florham Park') || originalAlt.includes('NJ')) {
                img.attr('alt', `Luxury property listing in ${cityReal}`);
              }
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

          // Replace duplicate copyrights (e.g. Signature Realty leaks in drawer and main footer)
          $('p:contains("SIGNATURE REALTY"), span:contains("SIGNATURE REALTY"), div:contains("SIGNATURE REALTY")').each((_, el) => {
            if ($(el).children().length === 0 || $(el).find('p').length === 0) {
              const text = $(el).text();
              $(el).text(
                text.replace(/SIGNATURE REALTY NJ/g, displayName)
                    .replace(/SIGNATURE REALTY/g, displayName)
                    .replace(/Signature Realty/g, displayName)
                    .replace(/New Jersey/g, cityReal)
              );
            }
          });
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

      // --- Inject Secure AI Host Chatbot ---
      console.log('[Layout Adapter] Injecting AI Host Chatbot widget into page...');
      
      const faqsJson = JSON.stringify(copyData.faqs || []);
      const factsJson = JSON.stringify({
        name: researchData.title,
        category: researchData.category,
        description: researchData.description,
        address: researchData.address,
        phone: researchData.phone,
        hours: researchData.hours,
        services: copyData.services || []
      });
      const bizName = researchData.title || 'us';

      const chatbotHtml = `
      <!-- AI Host Chatbot Style -->
      <style>
        .host-launcher {
          position: fixed;
          z-index: 9999;
          right: 24px;
          bottom: 24px;
          border: 0;
          border-radius: 9999px;
          padding: 14px 22px;
          background: #111;
          color: #fff;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          box-shadow: 0 8px 30px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .host-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          background: #222;
        }
        .host-drawer {
          position: fixed;
          z-index: 10000;
          right: 24px;
          bottom: 88px;
          width: min(400px, calc(100vw - 32px));
          height: min(580px, calc(100vh - 120px));
          display: none;
          flex-direction: column;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.15);
          overflow: hidden;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .host-drawer.open {
          display: flex;
        }
        .host-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          background: #111;
          color: #fff;
        }
        .host-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .host-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #111;
          font-weight: 700;
        }
        .host-header-text strong {
          display: block;
          font-size: 14px;
        }
        .host-header-text small {
          display: block;
          font-size: 11px;
          opacity: 0.8;
        }
        .host-close-btn {
          border: 0;
          background: transparent;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .host-close-btn:hover {
          opacity: 1;
        }
        .host-chat-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .host-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
        }
        .host-bubble.agent {
          background: #e5e7eb;
          color: #1f2937;
          align-self: flex-start;
          border-top-left-radius: 4px;
        }
        .host-bubble.user {
          background: #111;
          color: #fff;
          align-self: flex-end;
          border-top-right-radius: 4px;
        }
        .host-bubble.system-error {
          background: #fee2e2;
          color: #991b1b;
          align-self: center;
          font-size: 12px;
          border-radius: 8px;
          text-align: center;
        }
        .host-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 0 20px 10px;
          background: #f9fafb;
        }
        .host-suggestion-btn {
          border: 1px solid #e5e7eb;
          background: #fff;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          color: #4b5563;
          cursor: pointer;
          transition: all 0.2s;
        }
        .host-suggestion-btn:hover {
          background: #f3f4f6;
          color: #111;
          border-color: #d1d5db;
        }
        .host-input-area {
          padding: 14px 20px;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }
        .host-form {
          display: flex;
          gap: 8px;
        }
        .host-input {
          flex: 1;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .host-input:focus {
          border-color: #111;
        }
        .host-send-btn {
          border: 0;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          background: #111;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .host-send-btn:hover {
          background: #222;
        }
        .host-footer-note {
          font-size: 10px;
          color: #9ca3af;
          text-align: center;
          margin-top: 6px;
        }
      </style>

      <!-- AI Host Chat Drawer Widget -->
      <button class="host-launcher" id="host-launcher" aria-expanded="false">
        <span>✦</span> Ask Host
      </button>

      <aside class="host-drawer" id="host-drawer">
        <div class="host-header">
          <div class="host-header-title">
            <div class="host-avatar">✦</div>
            <div class="host-header-text">
              <strong>${bizName} Host</strong>
              <small>Ask me anything</small>
            </div>
          </div>
          <button class="host-close-btn" id="host-close-btn">&times;</button>
        </div>
        <div class="host-chat-body" id="host-chat-body">
          <div class="host-bubble agent">
            Welcome to ${bizName}! I'm your digital host. Ask me about our hours, location, or services.
          </div>
        </div>
        <div class="host-suggestions" id="host-suggestions">
          <button class="host-suggestion-btn">What are your hours?</button>
          <button class="host-suggestion-btn">Where are you located?</button>
          <button class="host-suggestion-btn">What services do you offer?</button>
        </div>
        <div class="host-input-area">
          <form class="host-form" id="host-form">
            <input type="text" class="host-input" id="host-input" placeholder="Ask a question..." required autocomplete="off">
            <button type="submit" class="host-send-btn" id="host-send-btn">➔</button>
          </form>
          <div class="host-footer-note">Powered by LeadFlow AI</div>
        </div>
      </aside>

      <!-- Chat Logic -->
      <script>
        (function() {
          const launcher = document.getElementById('host-launcher');
          const drawer = document.getElementById('host-drawer');
          const closeBtn = document.getElementById('host-close-btn');
          const chatBody = document.getElementById('host-chat-body');
          const form = document.getElementById('host-form');
          const input = document.getElementById('host-input');
          const sendBtn = document.getElementById('host-send-btn');
          const suggestions = document.getElementById('host-suggestions');

          const faqs = ${faqsJson};
          const facts = ${factsJson};
          const conversation = [];
          let customQueryCount = 0;

          launcher.addEventListener('click', () => {
            const isOpen = drawer.classList.toggle('open');
            launcher.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
              input.focus();
            }
          });

          closeBtn.addEventListener('click', () => {
            drawer.classList.remove('open');
            launcher.setAttribute('aria-expanded', 'false');
          });

          function addBubble(text, sender = 'agent') {
            const bubble = document.createElement('div');
            bubble.className = 'host-bubble ' + sender;
            bubble.textContent = text;
            chatBody.appendChild(bubble);
            chatBody.scrollTop = chatBody.scrollHeight;
            return bubble;
          }

          function getKeywordOverlap(s1, s2) {
            const stopWords = new Set([
              "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves",
              "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
              "theirs", "themselves", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
              "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
              "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", "with", "about",
              "against", "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up",
              "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when",
              "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no",
              "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "should", "now", "get"
            ]);
            const clean = s => s.toLowerCase().replace(/[^a-z0-9\\s]/g, '').split(/\\s+/).filter(w => w && !stopWords.has(w));
            const w1 = new Set(clean(s1));
            const w2 = clean(s2);
            let overlap = 0;
            w2.forEach(w => {
              if (w1.has(w)) overlap++;
            });
            return overlap;
          }

          async function handleUserMessage(text) {
            const userMsg = text.trim();
            if (!userMsg) return;

            // Remove suggestions once conversation starts
            if (suggestions) suggestions.style.display = 'none';

            addBubble(userMsg, 'user');
            conversation.push({ role: 'user', content: userMsg });
            input.value = '';
            
            // 1. Local FAQ Deflection Check
            let bestMatch = null;
            let maxOverlap = 0;
            
            faqs.forEach(faq => {
              const overlap = getKeywordOverlap(faq.q, userMsg);
              if (overlap > maxOverlap) {
                maxOverlap = overlap;
                bestMatch = faq;
              }
            });

            if (bestMatch && maxOverlap >= 1) {
              console.log('[Chat] Local FAQ Match Found: ', bestMatch.q);
              setTimeout(() => {
                addBubble(bestMatch.a, 'agent');
                conversation.push({ role: 'assistant', content: bestMatch.a });
              }, 400);
              return;
            }

            // 2. Fallback to API Worker
            if (customQueryCount >= 8) {
              addBubble("You have reached the limit of 8 custom questions for this session. Please call or contact us directly using the details below!", "system-error");
              input.disabled = true;
              sendBtn.disabled = true;
              return;
            }

            console.log('[Chat] Falling back to secure API...');
            const loader = addBubble('Typing...', 'agent');
            
            try {
              const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  messages: conversation.slice(-8),
                  facts: facts
                })
              });
              
              const data = await res.json();
              loader.remove();

              if (!res.ok) {
                throw new Error(data.error || 'Server error.');
              }

              customQueryCount++;
              addBubble(data.reply, 'agent');
              conversation.push({ role: 'assistant', content: data.reply });
            } catch (err) {
              loader.remove();
              addBubble('I am having trouble connecting right now. Please reach out to us using the contact details below!', 'system-error');
              console.error('[Chat Error]', err.message);
            }
          }

          form.addEventListener('submit', e => {
            e.preventDefault();
            handleUserMessage(input.value);
          });

          // Handle Suggestion Buttons
          document.querySelectorAll('.host-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              handleUserMessage(btn.textContent);
            });
          });
        })();
      </script>
      `;

      $('body').append(chatbotHtml);

      // --- Copy and Compile Serverless API Chat Function ---
      const srcFunctionsDir = path.join(__dirname, '../functions');
      const destFunctionsDir = path.join(buildDir, 'functions');
      
      if (fs.existsSync(srcFunctionsDir)) {
        console.log('[Layout Adapter] Copying and compiling serverless function to build folder...');
        if (!fs.existsSync(destFunctionsDir)) {
          fs.mkdirSync(destFunctionsDir, { recursive: true });
        }
        
        // Copy recursively
        fs.cpSync(srcFunctionsDir, destFunctionsDir, { recursive: true });
        
        // Compile functions/api/chat.js with business facts
        const chatFunctionPath = path.join(destFunctionsDir, 'api/chat.js');
        if (fs.existsSync(chatFunctionPath)) {
          let chatCode = fs.readFileSync(chatFunctionPath, 'utf8');
          
          const facts = {
            name: researchData.title,
            category: researchData.category,
            description: researchData.description,
            address: researchData.address,
            phone: researchData.phone,
            hours: researchData.hours,
            services: copyData.services || []
          };
          
          chatCode = chatCode.replace('__BIZ_FACTS__', JSON.stringify(facts, null, 2));
          fs.writeFileSync(chatFunctionPath, chatCode, 'utf8');
          console.log('[Layout Adapter] Compiled serverless chat function with business facts.');
        }
      }

      // --- Final safety net: headline must always appear in the body ---
      // If none of the template-specific h1 selectors matched, the headline
      // never got written. This catch-all guarantees it always does.
      if (copyData.headline) {
        const normalise = s => s.replace(/\s+/g, ' ').toLowerCase().trim();
        const anchor = normalise(copyData.headline).substring(0, 40);
        if (anchor.length > 5 && !normalise($('body').text()).includes(anchor)) {
          console.log('[Layout Adapter] Headline missing from body — injecting via first h1 fallback.');
          $('h1').first().text(copyData.headline);
        }
      }

      let finalHtml = $.html();
      if (templateId === 'realestate') {
        const cityReal = researchData.address ? researchData.address.split(',').slice(-2, -1)[0]?.trim() || 'Chandigarh' : 'Chandigarh';
        finalHtml = finalHtml
          .replace(/Edison, NJ/g, cityReal)
          .replace(/Florham Park, NJ/g, cityReal)
          .replace(/Edison NJ/g, cityReal)
          .replace(/Florham Park/g, cityReal)
          .replace(/New Jersey/g, cityReal);
      }
      fs.writeFileSync(filePath, finalHtml, 'utf8');
      console.log(`Successfully adapted ${file} using dynamic Cheerio config`);
    } catch (err) {
      console.error(`Failed to adapt ${file}:`, err.message);
    }
  }

  console.log('[Step 4] Layout adaptation complete.');
}

module.exports = { adaptLayout };
