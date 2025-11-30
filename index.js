import express from "express";
import fetch from "node-fetch";

const app = express();

// CONFIG TWITCH
const CLIENT_ID = "YOUR_TWITCH_CLIENT_ID";
const CLIENT_SECRET = "YOUR_TWITCH_CLIENT_SECRET";

// Lấy app token Twitch
async function getAppToken() {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;

  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  return data.access_token;
}

// Lấy token + sig (stream access key)
async function getStreamAccessToken(channel, appToken) {
  const url = `https://api.twitch.tv/api/channels/${channel}/access_token`;
  const res = await fetch(url, {
    headers: {
      "Client-ID": CLIENT_ID,
      "Authorization": `Bearer ${appToken}`
    }
  });
  return await res.json();
}

// Tạo endpoint .m3u8
app.get("/twitch.m3u8", async (req, res) => {
  const channel = req.query.channel;
  if (!channel) return res.status(400).send("Missing ?channel=");

  try {
    const appToken = await getAppToken();
    const tokenData = await getStreamAccessToken(channel, appToken);

    const streamUrl =
      `https://usher.ttvnw.net/api/channel/hls/${channel}.m3u8?` +
      `token=${encodeURIComponent(tokenData.token)}&sig=${tokenData.sig}` +
      `&allow_source=true&allow_audio_only=true&type=any&p=${Math.floor(Math.random()*999999)}`;

    const streamRes = await fetch(streamUrl);

    // Bypass CORS + đúng định dạng m3u8
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "*");
    res.set("Content-Type", "application/vnd.apple.mpegurl");

    const m3u8 = await streamRes.text();
    res.send(m3u8);

  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

app.listen(3000, () => console.log("Twitch Proxy is running on port 3000"));
