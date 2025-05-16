import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());

app.get("/eurovision-odds", async (req, res) => {
    try {
        console.log("🚀 Puppeteer starting...");
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

        console.log("🌐 Loading page...");
        await page.goto("https://eurovisionworld.com/odds/eurovision", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        await page.waitForSelector("tr[data-dt]", { timeout: 30000 });

        console.log("🔍 Extracting data...");
        const oddsData = await page.evaluate(() => {
            const results = [];

            document.querySelectorAll("tr[data-dt]").forEach((row) => {
                const countryEl = row.querySelector("td.odt a");
                const winChanceEl = row.querySelector("td[data-prb]");
                const oddsEls = row.querySelectorAll("td:not(.odt):not(.ohi):not(.opo)");

                if (!countryEl || !winChanceEl || oddsEls.length === 0) {
                    console.log("⚠️ Row skipped due to missing data");
                    return;
                }

                // 🔥 Extraction propre du pays, artiste et chanson
                const rawText = countryEl.getAttribute("title");
                const match = rawText.match(/Eurovision 2025 (.*?): (.*?) - "(.*?)"/);

                if (!match) {
                    console.warn("⚠️ Format inattendu :", rawText);
                    return;
                }

                const country = match[1].trim();
                const artist = match[2].trim();
                const song = match[3].trim();
                const winChance = parseFloat(winChanceEl.getAttribute("data-prb"));
                const odds = Array.from(oddsEls).map(td => parseFloat(td.textContent.trim()));

                results.push({ country, artist, song, winChance, odds });
            });

            return results;
        });

        console.log("📊 Data extracted:", oddsData.length, "entries");
        await browser.close();

        res.json({
            count: oddsData.length,
            entries: oddsData
        });

    } catch (error) {
        console.error("❌ Scraping error:", error);
        res.status(500).json({ message: "Error during scraping", error: error.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Eurovision backend ready on port ${PORT}`);
});
