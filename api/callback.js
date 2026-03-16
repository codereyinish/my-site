export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    res.status(400).send('Missing code');
    return;
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await response.json();

  if (data.error) {
    const message = JSON.stringify(`authorization:github:error:${JSON.stringify(data)}`);
    res.send(`<!doctype html><html><body><script>window.opener.postMessage(${message},'*');window.close();</script></body></html>`);
    return;
  }

  const content = JSON.stringify(`authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`);
  res.send(`<!doctype html><html><body><script>window.opener.postMessage(${content},'*');window.close();</script></body></html>`);
}
