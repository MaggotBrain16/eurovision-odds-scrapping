import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API Eurovision Odds !");
});

// Fix Puppeteer cache pour qu'il trouve Chromium
process.env.PUPPETEER_CACHE_DIR = "/opt/render/.cache/puppeteer";
process.env.CHROME_BIN = "/opt/render/.cache/puppeteer/chrome";

app.get("/eurovision-odds", async (req, res) => {
    let browser;
    try {
        console.log("🚀 Vérification du chemin de Chromium...");
        const browserPath = process.env.CHROME_BIN;

        console.log("✅ Chemin de Chromium utilisé :", browserPath);
        console.log("🚀 Puppeteer démarrage...");

        browser = await puppeteer.launch({
            headless: true,
            executablePath: browserPath,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        console.log("🌐 Chargement de la page...");
        await page.goto("https://eurovisionworld.com/odds/eurovision", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        await page.waitForSelector("tr[data-dt]", { timeout: 30000 });

        console.log("🔍 Extraction des données...");
        const oddsData = await page.evaluate(() => {
            const results = [];

            document.querySelectorAll("tr[data-dt]").forEach((row) => {
                const countryEl = row.querySelector("td.odt a");
                const winChanceEl = row.querySelector("td[data-prb]");
                const oddsEls = row.querySelectorAll("td:not(.odt):not(.ohi):not(.opo)");

                if (!countryEl || !winChanceEl || oddsEls.length === 0) {
                    console.log("⚠️ Ligne ignorée (données manquantes)");
                    return;
                }

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

        console.log("📊 Données extraites :", oddsData.length, "entrées");
        await browser.close();

        res.json({ count: oddsData.length, entries: oddsData });

    } catch (error) {
        console.error("❌ Erreur de scraping :", error);
        if (browser) await browser.close();
        res.status(500).json({ message: "Error during scraping", error: error.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Eurovision backend prêt sur le port ${PORT}`);
});