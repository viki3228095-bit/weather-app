import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;
const API_KEY = process.env.API_KEY;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("styles"));
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", { weather: null, error: null });
});

app.post("/weather", async (req, res) => {
  const city = req.body.city;
  try {
    // Step 1: city ka naam -> lat/lon (Geocoding API)
    const geo = await axios.get("https://api.openweathermap.org/geo/1.0/direct", {
      params: { q: city, limit: 1, appid: API_KEY },
    });
    if (geo.data.length === 0) {
      return res.render("index", { weather: null, error: "Ye city nahi mili. Spelling check karein." });
    }
    const { lat, lon, name, country } = geo.data[0];

    // Step 2: lat/lon -> forecast (5 din, har 3 ghante)
    const fc = await axios.get("https://api.openweathermap.org/data/2.5/forecast", {
      params: { lat, lon, units: "metric", appid: API_KEY },
    });
    console.log(JSON.stringify(fc.data, null, 2));
    const tz = fc.data.city.timezone; // seconds
    const localDate = (dt) => new Date((dt + tz) * 1000).toISOString().slice(0, 10);

    const today = localDate(Math.floor(Date.now() / 1000));
    const tomorrow = localDate(Math.floor(Date.now() / 1000) + 86400);

    const tomorrowItems = fc.data.list.filter((i) => localDate(i.dt) === tomorrow);
    const willRain = tomorrowItems.some((i) => i.weather[0].main === "Rain" || i.weather[0].main === "Thunderstorm");
    const maxPop = Math.round(Math.max(0, ...tomorrowItems.map((i) => i.pop || 0)) * 100);
    const temps = tomorrowItems.map((i) => i.main.temp);

    const now = fc.data.list[0];
    res.render("index", {
      error: null,
      weather: {
        city: `${name}, ${country}`,
        temp: Math.round(now.main.temp),
        feels: Math.round(now.main.feels_like),
        humidity: now.main.humidity,
        wind: now.wind.speed,
        desc: now.weather[0].description,
        icon: now.weather[0].icon,
        willRain,
        maxPop,
        tomorrowMin: temps.length ? Math.round(Math.min(...temps)) : "-",
        tomorrowMax: temps.length ? Math.round(Math.max(...temps)) : "-",
      },
    });
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
    const msg = err.response && err.response.status === 401
      ? "API key sahi nahi hai (ya abhi active nahi hui, 1-2 ghante lag sakte hain)."
      : "Kuch masla aaya, dobara try karein.";
    res.render("index", { weather: null, error: msg });
  }
});

app.listen(port, () => console.log(`Server chal raha hai: http://localhost:${port}`));
