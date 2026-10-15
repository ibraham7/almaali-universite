#!/usr/bin/env bash
# One-time server setup for Al-Maali University.
# Run as root:  curl -fsSL https://raw.githubusercontent.com/ibraham7/almaali-universite/main/deploy/install.sh | bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ibraham7/almaali-universite.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/almaali}"
DOMAINS="${DOMAINS:-uni.novanoai.online api.uni.novanoai.online}"

if [ "$(id -u)" -ne 0 ]; then
  echo "شغّل السكربت كـ root" >&2
  exit 1
fi

echo "==> تنزيل البرامج"
command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
apt-get update -qq
apt-get install -y -qq git nginx certbot python3-certbot-nginx

echo "==> تنزيل الكود"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch -q origin "$BRANCH"
  git -C "$APP_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
else
  git clone -q -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo
  echo "الصق رابط قاعدة البيانات (External Database URL من Render) واضغط Enter:"
  read -r DATABASE_URL < /dev/tty
  if [ -z "$DATABASE_URL" ]; then
    echo "ما في رابط، وقفنا." >&2
    exit 1
  fi
  umask 077
  printf 'DATABASE_URL=%s\nJWT_SECRET=%s\n' "$DATABASE_URL" "$(openssl rand -hex 32)" > "$APP_DIR/.env"
fi
printf 'BRANCH=%s\nAPP_DIR=%s\n' "$BRANCH" "$APP_DIR" > /etc/almaali-deploy.conf

echo "==> إعداد Nginx"
cp "$APP_DIR/deploy/nginx-almaali.conf" /etc/nginx/sites-available/almaali
ln -sf /etc/nginx/sites-available/almaali /etc/nginx/sites-enabled/almaali
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "==> تفعيل التحديث التلقائي"
chmod +x "$APP_DIR/deploy/update.sh"
ln -sf "$APP_DIR/deploy/update.sh" /usr/local/bin/almaali-update
cat > /etc/systemd/system/almaali-update.service <<UNIT
[Unit]
Description=Pull and deploy Al-Maali University updates
After=network-online.target docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/almaali-update
UNIT
cat > /etc/systemd/system/almaali-update.timer <<UNIT
[Unit]
Description=Check for Al-Maali University updates every 2 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now almaali-update.timer

echo "==> أول تشغيل للموقع (بياخد كم دقيقة)"
almaali-update --force

echo "==> شهادة SSL"
CERT_ARGS=()
for d in $DOMAINS; do CERT_ARGS+=(-d "$d"); done
if ! certbot --nginx "${CERT_ARGS[@]}" --redirect --agree-tos --register-unsafely-without-email -n; then
  echo "⚠️ SSL ما اشتغل. خلي الـ DNS يأشّر على هالسيرفر وبعدين شغّل: certbot --nginx ${CERT_ARGS[*]} --redirect"
fi

echo
echo "✅ خلص. IP السيرفر: $(curl -fsS https://ifconfig.me || echo غير معروف)"
echo "   أي تعديل بينرفع على فرع $BRANCH بيوصل للسيرفر لحاله خلال دقيقتين."
echo "   للتحديث فوراً اكتب: almaali-update"
