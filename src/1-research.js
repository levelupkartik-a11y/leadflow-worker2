const { composioExecute } = require('./utils');

async function researchBusiness(mapsUrl, rowId, sheetName) {
  console.log(`[Step 1] Researching business using Maps link: ${mapsUrl}`);
  
  // To ensure a reliable deep search, we fetch the business details from the sheet.
  // If the business name is generic (e.g. "Restaurant", "Salon"), we combine it with the address to ensure a precise match.
  let query = mapsUrl;
  if (rowId && sheetName) {
    try {
      const sheetResult = await composioExecute('GOOGLESHEETS_VALUES_GET', {
        spreadsheet_id: '1fWDfzFew_vKfKErtoBzahlyDbG_NMvcZDpXPSDaMJ9k',
        range: `${sheetName}!A${rowId}:D${rowId}`,
        value_render_option: 'FORMATTED_VALUE'
      });
      const rows = sheetResult?.data?.values || [];
      if (rows.length > 0 && rows[0][0]) {
        const name = rows[0][0].trim();
        const address = rows[0][3] ? rows[0][3].trim() : '';
        const genericNames = new Set(['restaurant', 'salon', 'spa', 'shop', 'store', 'hotel', 'dhaba', 'cafe', 'bar', 'gym', 'clinic', 'hospital']);
        
        if (genericNames.has(name.toLowerCase()) && address) {
          query = `${name} ${address}`;
          console.log(`[Step 1] Generic name detected. Extracted combined query from sheet: ${query}`);
        } else {
          query = `${name} in ${sheetName}`;
          console.log(`[Step 1] Extracted business name from sheet for reliable search: ${query}`);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch business name from sheet, falling back to URL extraction.', e.message);
    }
  }

  // Try to search via Composio using the query
  const result = await composioExecute('COMPOSIO_SEARCH_GOOGLE_MAPS', {
    q: query,
    start: 0,
  });

  const localResults = result?.data?.results?.local_results || [];
  let place = result?.data?.results?.place_results || null;

  if (!place && localResults.length > 0) {
    place = localResults[0]; 
  }
  if (!place) {
    throw new Error('Could not find business data for the provided Maps link.');
  }
  
  const researchData = {
    title: place.title || '',
    description: place.description || place.about || '',
    category: place.type || 'General',
    reviews: (() => {
      let r = place.reviews;
      if (!r && place.user_reviews && place.user_reviews.most_relevant) r = place.user_reviews.most_relevant;
      if (!Array.isArray(r)) r = [];
      return r.map(x => x.text || x.snippet || x.description || '').filter(Boolean);
    })(),
    photos: (place.photos || []).map(p => p.image || p.link || p).filter(Boolean),
    hours: (() => {
      const h = place.operating_hours || place.hours;
      if (Array.isArray(h)) {
        return h.map(item => {
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item).map(([day, time]) => `${day}: ${time}`).join(', ');
          }
          return item;
        }).join(', ');
      }
      if (typeof h === 'object' && h !== null) {
        return Object.entries(h).map(([day, time]) => `${day}: ${time}`).join(', ');
      }
      return h || '';
    })(),
    address: place.address || '',
    phone: place.phone || '',
    rating: place.rating || place.stars || place.review_rating || '',
    priceLevel: place.price || place.price_level || '',
    attributes: (() => {
      if (typeof place.attributes === 'object' && place.attributes !== null) {
        return Object.entries(place.attributes)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join('; ');
      }
      return place.attributes || '';
    })(),
    posts: place.posts || []
  };

  console.log(`[Step 1] Research complete for ${researchData.title}`);
  return researchData;
}

module.exports = { researchBusiness };
