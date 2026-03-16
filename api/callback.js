export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.send(`<!doctype html><html><body>
      <p style="font-family:sans-serif;color:red;padding:40px">GitHub error: ${error}</p>
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
    return res.send(`<!doctype html><html><body>
      <p style="font-family:sans-serif;color:red;padding:40px">Token error: ${JSON.stringify(data)}</p>
    </body></html>`);
  }

  const message = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;
  const msgJson = JSON.stringify(message);

  res.send(`<!doctype html><html><body><script>
    const msg = ${msgJson};

    // Chrome / Firefox: window.opener is still alive after cross-origin redirect
    if (window.opener) {
      window.opener.postMessage(msg, '*');
      window.close();
    } else {
      // Safari: opener is killed after visiting github.com (cross-origin).
      // Use BroadcastChannel — same-origin pages in the same browser share it.
      try {
        const bc = new BroadcastChannel('decap-auth');
        bc.postMessage(msg);
        bc.close();
        document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:#333">✓ Authenticated! Closing…</p>';
        setTimeout(() => window.close(), 800);
      } catch(e) {
        document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:red">Auth succeeded but could not notify CMS: ' + e.message + '</p>';
      }
    }
  </script></body></html>`);
}
