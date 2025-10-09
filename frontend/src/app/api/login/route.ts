export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Pretend to validate credentials during development
    const isValid = Boolean(data?.email) && Boolean(data?.password);

    if (!isValid) {
      return new Response(JSON.stringify({ ok: false, error: "Missing email or password" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: "Login successful (mock)" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

