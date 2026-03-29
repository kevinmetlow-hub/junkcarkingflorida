export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    await context.env.DB.prepare(`
      INSERT INTO orders (raw_json)
      VALUES (?)
    `).bind(
      JSON.stringify(body)
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(`
      SELECT * FROM orders ORDER BY id DESC
    `).all();

    return new Response(JSON.stringify(results || []), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}