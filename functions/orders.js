export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(`
      SELECT id, raw_json
      FROM orders
      ORDER BY id DESC
    `).all();

    const parsed = (results || []).map((row) => {
      let obj = {};
      try {
        obj = row.raw_json ? JSON.parse(row.raw_json) : {};
      } catch (e) {
        obj = {};
      }
      obj._dbId = row.id;
      return obj;
    });

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const orderId = body?.id || null;

    if (orderId) {
      const existing = await context.env.DB.prepare(`
        SELECT id FROM orders
        WHERE json_extract(raw_json, '$.id') = ?
        LIMIT 1
      `).bind(orderId).first();

      if (existing && existing.id) {
        await context.env.DB.prepare(`
          UPDATE orders
          SET raw_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(JSON.stringify(body), existing.id).run();

        return new Response(JSON.stringify({ success: true, id: existing.id, updated: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const result = await context.env.DB.prepare(`
      INSERT INTO orders (raw_json)
      VALUES (?)
    `).bind(JSON.stringify(body)).run();

    return new Response(JSON.stringify({ success: true, id: result.meta?.last_row_id || null }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPatch(context) {
  try {
    const url = new URL(context.request.url);
    const dbId = url.searchParams.get("id");
    if (!dbId) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await context.request.json();

    await context.env.DB.prepare(`
      UPDATE orders
      SET raw_json = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(JSON.stringify(body), dbId).run();

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

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    const all = url.searchParams.get("all");
    const dbId = url.searchParams.get("id");

    if (all === "1") {
      await context.env.DB.prepare(`DELETE FROM orders`).run();
    } else {
      if (!dbId) {
        return new Response(JSON.stringify({ error: "Missing id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      await context.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(dbId).run();
    }

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