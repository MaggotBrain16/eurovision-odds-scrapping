import express from "express";
import puppeteer from "puppeteer-core";
import chromium from "chrome-aws-lambda";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Activer CORS
app.use(cors());

app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API Eurovision Odds !");
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Service is running" });
});

app.get("/eurovision-odds", async (req, res) => {
    let browser;
    try {
        console.log("🚀 Démarrage du scraping...");

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

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
                    return;
                }

                const rawText = countryEl.getAttribute("title");
                const match = rawText.match(/Eurovision 2025 (.*?): (.*?) - "(.*?)"/);

                if (!match) {
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
        
        res.json({
            count: oddsData.length,
            entries: oddsData,
            timestamp: new Date().toISOString(),
            success: true
        });

    } catch (error) {
        console.error("❌ Erreur de scraping :", error);
        res.status(500).json({ 
            message: "Error during scraping", 
            error: error.toString(),
            success: false,
            timestamp: new Date().toISOString()
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.use((err, req, res, next) => {
    console.error("Error middleware:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Eurovision backend prêt sur le port ${PORT}`);
});