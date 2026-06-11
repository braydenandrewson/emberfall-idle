const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) return response(401, { error: "Authentication required" });

  const store = getStore("player-saves");
  const key = `player-${user.sub}`;

  if (event.httpMethod === "GET") {
    const save = await store.get(key, { type: "json", consistency: "strong" });
    return response(200, { save: save || null });
  }

  if (event.httpMethod === "PUT") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid save data" });
    }
    if (!body.save || typeof body.save !== "object") return response(400, { error: "Save data is required" });
    const serialized = JSON.stringify(body.save);
    if (serialized.length > 250000) return response(413, { error: "Save data is too large" });
    await store.setJSON(key, body.save, { metadata: { updatedAt: Date.now() } });
    return response(200, { saved: true });
  }

  return response(405, { error: "Method not allowed" });
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(body)
  };
}
