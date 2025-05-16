#!/usr/bin/env bash
set -o errexit  # Arrêter en cas d'erreur

echo "🚀 Installation des dépendances..."
npm install

echo "🔧 Configuration du cache Puppeteer..."
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p $PUPPETEER_CACHE_DIR

echo "📥 Téléchargement de Chromium..."
npx puppeteer browsers install chrome

echo "✅ Puppeteer prêt à être utilisé !"