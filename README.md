# Vehicle RC Check

Web page + Node server using the Attestr Vehicle RC Check API (`POST /api/v2/public/checkx/rc`).

## Run locally
```
set ATTESTR_TOKEN=your_basic_auth_token     (Windows)
export ATTESTR_TOKEN=your_basic_auth_token  (Mac/Linux)
node server.js
```
Open http://localhost:3000

## Deploy on Render
- New Web Service from your GitHub repo
- Build command: (leave empty)  |  Start command: `node server.js`
- Environment variable: `ATTESTR_TOKEN` = token from Attestr "Register App"
- If Attestr IP whitelisting is on (error 4039), whitelist Render's outbound IPs.

## Notes
- Token stays on the server, never in the browser.
- Consent checkbox is enforced on the server (Attestr's DPDP V3 notice requires owner consent).
- Each lookup uses Attestr credits; 20 lookups / 10 min per IP limit is built in.
