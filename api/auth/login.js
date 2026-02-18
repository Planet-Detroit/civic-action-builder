const AUTH_PAYLOAD = "pd-tools-auth";
const COOKIE_DOMAIN = ".tools.planetdetroit.org";

async function signToken(secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(AUTH_PAYLOAD));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password, userId } = req.body;

    const authPassword = process.env.AUTH_PASSWORD;
    const authSecret = process.env.AUTH_SECRET;

    if (!authPassword || !authSecret) {
      return res.status(500).json({ error: "Auth not configured" });
    }

    if (!password || password !== authPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = await signToken(authSecret);
    const maxAge = 7 * 24 * 60 * 60;

    const cookies = [
      `pd_auth=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}`,
    ];

    if (userId) {
      cookies.push(
        `pd_user=${encodeURIComponent(userId)}; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${maxAge}`
      );
    }

    res.setHeader("Set-Cookie", cookies);
    return res.status(200).json({ success: true });
  } catch {
    return res.status(400).json({ error: "Invalid request" });
  }
}
