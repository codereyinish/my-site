export default function handler(req, res) {
  // VERCEL_URL is always set automatically by Vercel; SITE_URL is optional override
  const siteUrl = process.env.SITE_URL || `https://${process.env.VERCEL_URL}`;
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: 'repo,user',
    redirect_uri: `${siteUrl}/api/callback`,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
