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

  // Decap CMS netlify-auth.js requires a TWO-STEP handshake:
  //   Step 1: popup sends  "authorizing:github"                   → parent registers success listener
  //   Step 2: popup sends  "authorization:github:success:{...}"   → parent processes token
  // Skipping step 1 means the success listener is never registered and the token is silently ignored.
  const handshake = 'authorizing:github';
  const success   = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;

  const handshakeJson = JSON.stringify(handshake);
  const successJson   = JSON.stringify(success);

  // Store success msg so admin page can inject it on reload (Safari redirect fallback)
  res.send(`<!doctype html><html><body><script>
    const handshake = ${handshakeJson};
    const success   = ${successJson};

    try { localStorage.setItem('decap-auth-token', success); } catch(e) {}

    function send(target) {
      // Step 1: handshake — makes parent register its success listener
      target.postMessage(handshake, '*');
      // Step 2: success — parent's now-registered listener processes the token
      setTimeout(() => target.postMessage(success, '*'), 50);
    }

    if (window.opener) {
      send(window.opener);
      setTimeout(() => window.close(), 300);
    } else {
      // Safari: opener gone — use BroadcastChannel
      try {
        const bc = new BroadcastChannel('decap-auth');
        bc.postMessage(handshake);
        setTimeout(() => { bc.postMessage(success); bc.close(); }, 50);
      } catch(e) {}

      document.body.innerHTML = '<p style="font-family:sans-serif;padding:40px;color:#333">✓ Authenticated! Returning to CMS&hellip;</p>';
      setTimeout(() => {
        window.close();
        setTimeout(() => { window.location.href = '/admin'; }, 400);
      }, 600);
    }
  <\/script></body></html>`);
}
