import express from "express";
import fetch from "node-fetch";

const app = express();

app.get("/proxy", async (req, res) => {
  const url = req.query.url;

  if (!url) return res.status(400).send("Missing ?url=");

  try {
    const response = await fetch(url, {
      headers: {
        "Client-ID": "your_twitch_client_id",
        "Authorization": "Bearer your_access_token"
      }
    });

    // Lấy content-type của m3u8
    res.set("Content-Type", response.headers.get("content-type") || "application/vnd.apple.mpegurl");

    // Bypass CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");

    const body = await response.text();
    res.send(body);

  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

app.listen(3000, () => console.log("Proxy running on port 3000"));
