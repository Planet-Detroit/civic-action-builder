const AUTH_PAYLOAD = "pd-tools-auth";

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

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    cookies[name] = rest.join("=");
  });
  return cookies;
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.pd_auth;
  const authSecret = process.env.AUTH_SECRET;

  if (!token || !authSecret) {
    return res.status(401).json({ authenticated: false });
  }

  const expected = await signToken(authSecret);

  // Constant-time comparison
  if (token.length !== expected.length) {
    return res.status(401).json({ authenticated: false });
  }
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (mismatch !== 0) {
    return res.status(401).json({ authenticated: false });
  }

  const user = cookies.pd_user ? decodeURIComponent(cookies.pd_user) : null;
  return res.status(200).json({ authenticated: true, user });
}
