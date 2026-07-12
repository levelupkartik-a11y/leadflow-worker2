export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // 1. CORS Validation
    const origin = request.headers.get('Origin') || '';
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers, status: 204 });
    }

    // 1.5. IP Rate Limiting (Max 20 requests per hour per IP)
    const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
    if (ip !== 'anonymous') {
      try {
        const cache = caches.default;
        // Segment time into 1-hour blocks (3600 seconds)
        const hourSegment = Math.floor(Date.now() / (3600 * 1000));
        const cacheKey = `https://rate-limit.local/ip/${ip}/${hourSegment}`;
        
        const cachedResponse = await cache.match(cacheKey);
        let count = 0;
        if (cachedResponse) {
          count = parseInt(await cachedResponse.text(), 10) || 0;
        }
        
        if (count >= 20) {
          return new Response(JSON.stringify({ error: 'Too many requests from this IP. Please try again in an hour or contact the business directly.' }), {
            status: 429,
            headers
          });
        }
        
        // Save updated count back to cache
        count++;
        const newResponse = new Response(count.toString(), {
          headers: {
            'Cache-Control': 'public, max-age=3600'
          }
        });
        context.waitUntil(cache.put(cacheKey, newResponse));
      } catch (cacheErr) {
        console.warn('Rate limiter warning:', cacheErr.message);
        // Fallback: don't block the user if cache API has temporary issues
      }
    }

    // 2. Read GROQ_API_KEY from environment secrets
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured on backend.' }), {
        status: 500,
        headers
      });
    }

    // 3. Parse user messages payload
    const payload = await request.json();
    const userMessages = payload.messages || [];

    // Enforce server-side limit of 8 custom messages per session to prevent API abuse
    const userQueryCount = userMessages.filter(m => m.role === 'user').length;
    if (userQueryCount > 8) {
      return new Response(JSON.stringify({ error: 'You have reached the limit of 8 custom questions for this session.' }), {
        status: 429,
        headers
      });
    }

    // 4. Construct System Prompt using compiled or payload-provided business facts
    const bizFacts = payload.facts || {
  "name": "Wao Fitness-Best Gym In Chandigarh",
  "category": "Gym",
  "description": "",
  "address": "SCO 34,35,36, 37, Madhya Marg, 9D, Chandigarh 160009, India",
  "phone": "+91 62831 17815",
  "hours": "friday: 5:30 AM–10:30 PM, monday: 5:30 AM–10:30 PM, saturday: 5:30 AM–10:30 PM, sunday: 7 AM–1 PM, thursday: 5:30 AM–10:30 PM, tuesday: 5:30 AM–10:30 PM, wednesday: 5:30 AM–10:30 PM",
  "services": [
    {
      "name": "State-of-the-art equipment",
      "description": "Get fit with our latest machinery and expert trainers"
    },
    {
      "name": "Variety of classes",
      "description": "Take part in our fitness classes to stay fit and active"
    },
    {
      "name": "Expert trainers",
      "description": "Get trained by experienced fitness experts"
    }
  ]
};
    
    const systemPrompt = {
      role: 'system',
      content: `You are an AI Host for the business. Answer customer questions politely and accurately based ONLY on the following facts. If the answer is not in the facts, politely tell the customer you don't know and ask them to contact the business directly. Do not invent any facts, services, or pricing.
      
Facts:
${JSON.stringify(bizFacts, null, 2)}`
    };

    // Combine system prompt and user chat history
    const apiMessages = [systemPrompt, ...userMessages];

    // 5. Call Groq Llama-3.1-8b model
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: apiMessages,
        max_tokens: 150,
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Upstream API error.' }), {
        status: response.status,
        headers
      });
    }

    const reply = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that.";
    return new Response(JSON.stringify({ reply }), { headers, status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
