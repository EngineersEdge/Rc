// Vehicle RC Check - dependency-free Node server (Node 18+)
// Proxies requests to Attestr so the auth token never reaches the browser.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const TOKEN = process.env.ATTESTR_TOKEN; // the Basic auth token from Attestr "Register App"
const API = "https://api.attestr.com/api/v2/public/checkx/rc";

// simple per-IP rate limit: 20 lookups / 10 min
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 600000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20;
}

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/rc") {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 5000) req.destroy();
    });
    req.on("end", async () => {
      try {
        if (!TOKEN) return send(res, 500, { message: "Server token not configured" });
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        if (limited(ip)) return send(res, 429, { message: "Too many requests, try later" });

        const { reg, consent } = JSON.parse(body || "{}");
        // DPDP: explicit consent of the vehicle owner/data principal is required
        if (consent !== true)
          return send(res, 400, { message: "Owner's consent is required" });
        const clean = String(reg || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$|^\d{2}BH\d{4}[A-Z]{1,2}$/.test(clean))
          return send(res, 400, { message: "Invalid registration number format" });

        const r = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Basic " + TOKEN },
          body: JSON.stringify({ reg: clean }),
        });
        const data = await r.json().catch(() => ({ message: "Bad response from provider" }));
        send(res, r.status, data);
      } catch (e) {
        send(res, 500, { message: "Request failed" });
      }
    });
    return;
  }

  // static files
  const file = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const full = path.join(__dirname, "public", path.normalize(file));
  if (!full.startsWith(path.join(__dirname, "public"))) return send(res, 403, {});
  fs.readFile(full, (err, buf) => {
    if (err) return send(res, 404, { message: "Not found" });
    res.writeHead(200, { "Content-Type": full.endsWith(".html") ? "text/html" : "text/plain" });
    res.end(buf);
  });
});

server.listen(PORT, () => console.log("Running on " + PORT));
