export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(`
      SELECT id, raw_json, created_at, updated_at
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

      if (obj && typeof obj.raw_json === 'string') {
        try {
          const inner = JSON.parse(obj.raw_json);
          obj = Object.assign({}, inner, obj);
        } catch (e) {}
      }

      obj._dbId = row.id;
      obj.id = obj.id || obj.client_id || ('db_' + row.id);
      obj.client_id = obj.client_id || obj.id;
      obj.created_at = row.created_at || obj.created_at || '';
      obj.updated_at = row.updated_at || obj.updated_at || '';
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

    let canonical = body || {};
    if (body && typeof body.raw_json === 'string') {
      try {
        const inner = JSON.parse(body.raw_json);
        canonical = Object.assign({}, inner, body);
      } catch (e) {
        canonical = Object.assign({}, body);
      }
    } else {
      canonical = Object.assign({}, body);
    }

    canonical.id = canonical.id || canonical.client_id || null;
    canonical.client_id = canonical.client_id || canonical.id || null;

    const stored = JSON.stringify(canonical);
    const clientId = canonical.client_id || canonical.id || null;

    if (clientId) {
      const existing = await context.env.DB.prepare(`
        SELECT id
        FROM orders
        WHERE json_extract(raw_json, '$.client_id') = ?
           OR json_extract(raw_json, '$.id') = ?
        LIMIT 1
      `).bind(clientId, clientId).first();

      if (existing && existing.id) {
        await context.env.DB.prepare(`
          UPDATE orders
          SET raw_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(stored, existing.id).run();

        return new Response(JSON.stringify({ success: true, id: existing.id, updated: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const result = await context.env.DB.prepare(`
      INSERT INTO orders (raw_json)
      VALUES (?)
    `).bind(stored).run();

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
    const id = url.searchParams.get("id");

    if (all === "1") {
      await context.env.DB.prepare(`DELETE FROM orders`).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (/^\d+$/.test(id)) {
      await context.env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(id).run();
    } else {
      await context.env.DB.prepare(`
        DELETE FROM orders
        WHERE json_extract(raw_json, '$.client_id') = ?
           OR json_extract(raw_json, '$.id') = ?
      `).bind(id, id).run();
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