export async function onRequestGet(context) {
  const data = await context.env.Pricing.get("data");
  return new Response(data || "{}", {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const body = await context.request.json();

  await context.env.Pricing.put("data", JSON.stringify(body));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}

