async function composioExecute(actionSlug, args = {}) {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is missing');
  
  const url = `https://backend.composio.dev/api/v3.1/tools/execute/${actionSlug}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ entity_id: 'one', arguments: args }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const json = await res.json();
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${actionSlug}: ${JSON.stringify(json)}`);
    return json;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Composio request timed out after 45s on ${actionSlug}`);
    }
    throw err;
  }
}

module.exports = { composioExecute };
