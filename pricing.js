export async function onRequestGet(context) {
  const data = await context.env.PRICING.get("data");
  return new Response(data || "{}", {
    headers: { "Content-Type": "application/json" }
  });
}

export async function onRequestPost(context) {
  const body = await context.request.json();

  await context.env.PRICING.put("data", JSON.stringify(body));

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" }
  });
}