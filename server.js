
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

let lastCheck = 0;

app.post("/api/check", async (req, res) => {
  const username = String(req.body.username || "").toLowerCase();

  if (
    username.length < 2 ||
    username.length > 32 ||
    !/^[a-z0-9._]+$/.test(username) ||
    username.startsWith(".") ||
    username.endsWith(".") ||
    username.includes("..")
  ) {
    return res.status(400).json({
      status: "invalid"
    });
  }

  const now = Date.now();

  if (now - lastCheck < 1500) {
    return res.status(429).json({
      status: "rate_limited",
      message: "Please wait before checking again."
    });
  }

  lastCheck = now;

  try {
    const response = await fetch(
      "https://discord.com/api/v9/unique-username/username-attempt-unauthed",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ROVIX Username Checker"
        },
        body: JSON.stringify({ username }),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (response.status === 429) {
      return res.status(429).json({
        status: "rate_limited"
      });
    }

    const data = await response.json();

    if (
      response.ok &&
      typeof data.taken === "boolean"
    ) {
      return res.json({
        username,
        status: data.taken ? "taken" : "available"
      });
    }

    return res.status(response.status || 502).json({
      status: "unknown",
      message: "Discord did not confirm availability."
    });

  } catch (error) {
    return res.status(502).json({
      status: "error",
      message: "Unable to reach Discord."
    });
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("ROVIX SERVER STARTED");
});
