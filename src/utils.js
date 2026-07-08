async function composioExecute(actionSlug, args = {}) {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) throw new Error('COMPOSIO_API_KEY is missing');
  
  const url = `https://backend.composio.dev/api/v3.1/tools/execute/${actionSlug}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ entity_id: 'one', arguments: args }),
  });
  
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${actionSlug}: ${JSON.stringify(json)}`);
  return json;
}

module.exports = { composioExecute };
