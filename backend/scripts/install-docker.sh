#!/usr/bin/env bash
# Official Docker install for Ubuntu 24.04 (noble) — apt repo method, not the
# snap/docker.io shortcut, so `docker compose` (v2 plugin) is included.
set -euo pipefail

for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt-get remove -y "$pkg" 2>/dev/null || true
done

sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo — requires a new shell/session to take effect.
sudo usermod -aG docker "$USER"

echo
echo "Installe. Ferme ce terminal et rouvre-en un (ou lance 'newgrp docker')"
echo "pour que le groupe docker s'applique, puis: docker run hello-world"
