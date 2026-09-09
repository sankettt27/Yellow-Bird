#!/bin/bash
# ==============================================================================
# YellowBird Real-Time Bus Tracker — Oracle Cloud 1-Click Deployment Script
# ==============================================================================

set -e

echo "🚀 Starting YellowBird Server Deployment on Oracle Cloud..."

# 1. Update Ubuntu packages
echo "📦 Updating OS package repositories..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker, Docker Compose, and Netfilter utilities
echo "🐳 Installing Docker & Docker Compose..."
sudo apt install -y docker.io docker-compose-v2 git netfilter-persistent iptables-persistent

# 3. Enable Docker daemon
echo "🔧 Configuring Docker permissions..."
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu || true

# 4. Open Oracle Ubuntu OS firewall for HTTP (80), HTTPS (443), and FastAPI (8000)
echo "🛡️ Configuring Firewall ports (80, 443, 8000)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT || true
sudo netfilter-persistent save || true

# 5. Build and Launch Containers via Docker Compose
echo "🏗️ Building and starting YellowBird containers..."
docker compose -f docker/docker-compose.yml up -d --build

echo ""
echo "=============================================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=============================================================================="
echo "Backend API Docs: http://$(curl -s ifconfig.me):8000/docs"
echo "Public API URL:  http://$(curl -s ifconfig.me):8000/api/v1/schools/public"
echo "Web Portal:      http://$(curl -s ifconfig.me)"
echo "=============================================================================="
