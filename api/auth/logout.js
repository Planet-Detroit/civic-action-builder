const COOKIE_DOMAIN = ".tools.planetdetroit.org";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Set-Cookie", [
    `pd_auth=; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0`,
    `pd_user=; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0`,
  ]);
  return res.status(200).json({ success: true });
}
