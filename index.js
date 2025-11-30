import express from "express";
import fetch from "node-fetch";

const app = express();

// CONFIG TWITCH
const CLIENT_ID = "YOUR_TWITCH_CLIENT_ID";
const CLIENT_SECRET = "YOUR_TWITCH_CLIENT_SECRET";

/* ==========================
   SAFE JSON PARSER (ANTI ERROR)
========================== */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    const text = await res.text();
    console.log("JSON parse failed, raw response:", text);
    throw new Error("Twitch API returned non-JSON data");
  }
}

/* ==========================
   GET APP TOKEN
========================== */
async function getAppToken() {
  const url =
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}` +
    `&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;

  const res = await fetch(url, { method: "POST" });

  if (!res.ok) throw new Error("Failed to get app token");

  return await safeJson(res);
}

/* ==========================
   GET STREAM TOKEN + SIG
========================== */
async function getStreamAccessToken(channel, token) {
  const url = `https://api.twitch.tv/api/channels/${channel}/access_token`;

  const res = await fetch(url, {
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const t = await res.text();
    console.log("Access token error:", t);
    throw new Error("Twitch refused access (wrong channel or no permission)");
  }

  return await safeJson(res);
}

/* ==========================
   MAIN M3U8 PROXY ENDPOINT
========================== */
app.get("/twitch.m3u8", async (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.status(400).send("Missing ?channel=");

  try {
    const appTokenData = await getAppToken();
    const appToken = appTokenData.access_token;

    const streamData = await getStreamAccessToken(channel, appToken);

    const m3u8URL =
      `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8` +
      `?token=${encodeURIComponent(streamData.token)}` +
      `&sig=${streamData.sig}` +
      `&allow_source=true&allow_audio_only=true&type=any&p=${Math.random()*999999}`;

    const stream = await fetch(m3u8URL);

    if (!stream.ok) {
      const txt = await stream.text();
      console.log("Stream fetch error:", txt);
      throw new Error("Cannot fetch Twitch m3u8");
    }

    const playlist = await stream.text();

    // OUTPUT M3U8 CORRECTLY
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Content-Type", "application/vnd.apple.mpegurl");

    res.send(playlist);

  } catch (err) {
    console.log("Fatal Error:", err);
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(3000, () => console.log("Twitch Proxy ready on port 3000"));
