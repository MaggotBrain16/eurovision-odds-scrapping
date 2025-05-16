#!/usr/bin/env bash
set -o errexit  # Arrêter en cas d'erreur

echo "🚀 Installation des dépendances..."
npm install

echo "🔧 Vérification du cache Puppeteer..."
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

echo "🧐 Vérification de Chromium..."
if command -v chromium-browser > /dev/null; then
    echo "✅ Chromium déjà installé sur Render."
else
    echo "⚠️ Chromium non trouvé, utilisation d'une version portable..."
    npm install chrome-aws-lambda
fi

echo "📥 Téléchargement des navigateurs Puppeteer..."
npx puppeteer-core browsers install chrome || echo "⚠️ Échec du téléchargement, on continue avec une version existante."

echo "✅ Puppeteer et Chromium configurés !"