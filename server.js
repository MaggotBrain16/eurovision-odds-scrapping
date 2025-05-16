import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Activer CORS
app.use(cors());

// Route d'accueil pour éviter l'erreur "Cannot GET /"
app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API Eurovision Odds !");
});

// Route de santé pour Render
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", message: "Service is running" });
});

// Route principale : Scraping des cotes
app.get("/eurovision-odds", async (req, res) => {
    let browser;
    try {
        console.log("🚀 Puppeteer démarrage...");

        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });

        const page = await browser.newPage();

        // Réduire la charge mémoire
        await page.setViewport({ width: 1280, height: 720 });
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
        
        // Timestamp pour cache
        const timestamp = new Date().toISOString();
        
        res.json({
            count: oddsData.length,
            entries: oddsData,
            timestamp: timestamp,
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
        // Assurer la fermeture du navigateur
        if (browser) {
            await browser.close();
        }
    }
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
    console.error("Error middleware:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
});

// Démarrer le serveur
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Eurovision backend prêt sur le port ${PORT}`);
    console.log(`URL: http://0.0.0.0:${PORT}`);
});