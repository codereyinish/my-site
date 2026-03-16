export default async function handler(req, res) {
  const { code, error } = req.query;

  // GitHub sent back an error
  if (error) {
    return res.send(`<!doctype html><html><body>
      <p style="font-family:sans-serif;color:red">GitHub error: ${error}</p>
      <script>window.opener?.postMessage(JSON.stringify("authorization:github:error:${error}"), '*');</script>
    </body></html>`);
  }

  if (!code) {
    return res.status(400).send('Missing code. Params: ' + JSON.stringify(req.query));
  }

  let data;
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    data = await response.json();
  } catch (err) {
    return res.status(500).send('Fetch error: ' + err.message);
  }

  if (data.error || !data.access_token) {
    const msg = JSON.stringify(`authorization:github:error:${JSON.stringify(data)}`);
    return res.send(`<!doctype html><html><body>
      <p style="font-family:sans-serif;color:red">Token exchange failed: ${JSON.stringify(data)}</p>
      <script>window.opener?.postMessage(${msg}, '*'); window.close();</script>
    </body></html>`);
  }

  const content = JSON.stringify(`authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`);
  res.send(`<!doctype html><html><body><script>
    if (window.opener) {
      window.opener.postMessage(${content}, '*');
      window.close();
    } else {
      document.body.innerHTML = '<p style="font-family:sans-serif">Auth succeeded but no opener window found. Close this tab and try again.</p>';
    }
  </script></body></html>`);
}
