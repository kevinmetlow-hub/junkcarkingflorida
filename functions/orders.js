export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const {
      customer_name,
      phone,
      email,
      year,
      make,
      model,
      quoted_price,
      decision,
      pickup_type,
      pickup_day,
      pickup_date,
      pickup_time,
      address,
      status,
      notes
    } = body;

    await context.env.DB.prepare(`
      INSERT INTO orders (
        customer_name,
        phone,
        email,
        year,
        make,
        model,
        quoted_price,
        decision,
        status,
        pickup_type,
        pickup_day,
        pickup_date,
        pickup_time,
        address,
        notes,
        raw_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customer_name || "",
      phone || "",
      email || "",
      year || "",
      make || "",
      model || "",
      quoted_price || 0,
      decision || "pending",
      status || "new",
      pickup_type || "",
      pickup_day || "",
      pickup_date || "",
      pickup_time || "",
      address || "",
      notes || "",
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
      SELECT *
      FROM orders
      ORDER BY id DESC
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