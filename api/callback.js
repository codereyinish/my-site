export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.send(`<!doctype html><html><body>
      <p style="font-family:sans-serif;color:red;padding:40px">GitHub error: ${error}</p>
    </body></html>`);
  }

  if (!code) {
    return res.status(400).send('Missing code');
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

  const msg = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;
  const msgJson = JSON.stringify(msg);

  // Store token in localStorage so the admin page can pick it up
  // regardless of whether this runs in a popup or the main window.
  res.send(`<!doctype html><html><body><script>
    const msg = ${msgJson};

    // Always store — admin page reads this on load or when window.open is called
    try { localStorage.setItem('decap-auth-token', msg); } catch(e) {}

    if (window.opener) {
      // Chrome/Firefox: opener still alive, send directly
      window.opener.postMessage(msg, '*');
      window.close();
    } else {
      // Safari: opener killed after cross-origin navigation
      // BroadcastChannel notifies the admin tab
      try {
        const bc = new BroadcastChannel('decap-auth');
        bc.postMessage(msg);
        bc.close();
      } catch(e) {}

      document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:#333">✓ Authenticated! Returning to CMS&hellip;</p>';

      // Try to close this window; if it won't close (main-window redirect),
      // navigate back to /admin where the stored token will be picked up.
      setTimeout(() => {
        window.close();
        setTimeout(() => { window.location.href = '/admin'; }, 400);
      }, 600);
    }
  <\/script></body></html>`);
}
