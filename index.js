import express from "express";
import fetch from "node-fetch";

const app = express();

// ====================
// CONFIG
// ====================
const CLIENT_ID = "YOUR_TWITCH_CLIENT_ID";
const CLIENT_SECRET = "YOUR_TWITCH_CLIENT_SECRET";

// ====================
// GET TWITCH API TOKEN
// ====================
async function getAppToken() {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;

  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  return data.access_token;
}

// ====================
// GET STREAM TOKEN + SIG
// ====================
async function getStreamAccessToken(channel, appToken) {
  const apiURL = `https://api.twitch.tv/api/channels/${channel}/access_token`;

  const res = await fetch(apiURL, {
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${appToken}`
    }
  });

  return await res.json();
}

// ====================
// MAIN PROXY
// ====================
app.get("/twitch", async (req, res) => {
  try {
    const channel = req.query.channel;
    if (!channel) return res.status(400).json({ error: "Missing ?channel=xxxx" });

    const appToken = await getAppToken();
    const tokenData = await getStreamAccessToken(channel, appToken);

    const m3u8URL =
      `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8?` +
      `token=${encodeURIComponent(tokenData.token)}` +
      `&sig=${tokenData.sig}` +
      `&allow_source=true&allow_audio_only=true&type=any&p=${Math.floor(Math.random() * 999999)}`;

    // Fetch m3u8
    const m3u8Res = await fetch(m3u8URL);

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Content-Type", "application/vnd.apple.mpegurl");

    res.send(await m3u8Res.text());

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ====================
// START SERVER
// ====================
app.listen(3000, () => {
  console.log("Twitch Proxy Running on port 3000");
});
