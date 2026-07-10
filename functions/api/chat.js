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

    // 4. Construct System Prompt using compiled business facts
    const bizFacts = __BIZ_FACTS__;
    
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
