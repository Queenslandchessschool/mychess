export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return Response.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!productionUrl) return Response.json({ error: "VERCEL_PROJECT_PRODUCTION_URL is not configured." }, { status: 500 });
  const targetUrl = new URL("/api/attendance/reminder-8pm", `https://${productionUrl}`);
  const response = await fetch(targetUrl, { method: "POST", headers: { authorization: `Bearer ${cronSecret}` } });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
}