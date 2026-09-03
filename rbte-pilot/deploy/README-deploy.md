# Развертывание pilot.rbte.pro — Provisioning Guide

Редакция 1.2 (2026-08-25) — добавлен режим **deploy без sudo** (в HOME пользователя).

---

## ⚙️ Два режима деплоя

| Режим | Когда использовать | Рабочая папка | Нужен sudo? |
|---|---|---|---|
| **A. HOME deploy (рекомендуем сейчас)** | Пользователь без sudo (например, `www-data`, `deployer`-без-sudo) | `~/rbte/` и `~/rbte-logs/` | ❌ Нет |
| **B. Системный /var/www** | Есть sudo, стандартная иерархия | `/var/www/rbte/` | ✅ Да |

---

## 🏠 Режим А: Deploy в HOME (без sudo, шаг за шагом)

Этот режим сейчас используем, потому что пользователь www-data sudo не имеет.

### Шаг 1. Проверка пользователя и стека
```bash
whoami            # ожидаем: www-data или твой логин
id -gn            # группа
echo $HOME        # домашняя директория

# Проверить что инструменты доступны ТВОЕМУ пользователю:
node --version && echo "✅ node v22+ ОК"
pnpm --version && echo "✅ pnpm 9+ ОК"
pm2  --version && echo "✅ pm2 5+ ОК"
```

Если команда `pm2` = `command not found` — попроси админа один раз выполнить `sudo npm install -g pm2` от root.

### Шаг 2. Создание папок
```bash
# Никакого sudo! В HOME владельцем сразу будешь ты
export RBTE_ROOT="${HOME}/rbte"
export RBTE_LOGS="${HOME}/rbte-logs"

mkdir -p "${RBTE_ROOT}"/{repo,current,previous} \
         "${RBTE_LOGS}" \
         "${RBTE_ROOT}/repo/.knowledge-cache" \
         "${RBTE_ROOT}/repo/.npm-cache"

# Проверка прав
ls -la "${RBTE_ROOT}" && echo "" && ls -ld "${RBTE_LOGS}"
# Все 3 папки должны показывать <твой_логин>:<твоя_группа> в owner
```

### Шаг 3. Загрузка кода локального TRAE → pilot.pro (на Windows PowerShell)
```powershell
# На ТВОЕЙ ЛОКАЛЬНОЙ Windows-машине (PowerShell):
$DeployUser = "www-data"            # ← подставь whoami с сервера
$Server     = "pilot.rbte.pro"
$LocalRbte  = "c:\Users\editor\Documents\RBTE\Pack\rbte"

# Создаём zip (пропускаем node_modules/.next и кэши)
$Exclude = @("node_modules", ".next", ".knowledge-cache", ".npm-cache", ".git")
Compress-Archive -Path (Get-ChildItem -Path $LocalRbte -Exclude $Exclude) `
                 -DestinationPath "$env:TEMP\rbte-deploy.zip" -Force

# Отправляем по SSH
scp "$env:TEMP\rbte-deploy.zip" "${DeployUser}@${Server}:~/rbte/rbte-deploy.zip"
```

### Шаг 4. Распаковка на pilot.pro + .env.local
```bash
cd ~/rbte
ls -la rbte-deploy.zip   # должен существовать!

# Распаковать
unzip -q rbte-deploy.zip -d repo
rm -f rbte-deploy.zip

# Проверка
ls -la ~/rbte/repo/package.json   # ОК, если есть package.json
```

Теперь создай `~/rbte/repo/.env.local` и заполни **реальными** значениями:
```bash
cd ~/rbte/repo

# 1. Сгенери AUTH_SECRET один раз
AUTH_SECRET_HEX=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "AUTH_SECRET сгенерирован: ${AUTH_SECRET_HEX}"

# 2. Создаём .env.local (заполни DATABASE_URL и токены!)
cat > .env.local << ENVEOF
# === PostgreSQL — ЗАМЕНИ ПАРОЛЬ/ПОЛЬЗОВАТЕЛЯ/БАЗУ ===
DATABASE_URL="postgres://rbte_pilot_user:STRONG_PASSWORD_HERE@127.0.0.1:5432/rbte_pilot?sslmode=disable"

# === Auth (уже сгенерирован выше)
AUTH_SECRET="${AUTH_SECRET_HEX}"

# === AI provider (stub на время пилота)
AI_PROVIDER="stub"

# === Knowledge packs PINNED commits — НЕ ИЗМЕНЯТЬ БЕЗ РЕЛИЗА!
FPF_COMMIT="3d098629dc218572089f1890080c17d6f1d9a867"
PACK_AL_COMMIT="a6a3140"
PACK_AL_EDITION="DPF-EDITION@pilot-2026-08-23.14"

# ===== Pack-TOC (приватный Victor57618/Pack-TOC)
# Classic PAT scope=repo (создаёт ARB774 под своим аккаунтом):
GITHUB_READ_TOKEN="ghp_REPLACE_WITH_REAL_TOKEN_FROM_ARB774"
# Pin commit main ветки Victor57618/Pack-TOC (открой GitHub → скопируй hash7):
PACK_TOC_COMMIT="REPLACE_WITH_PACK_TOC_PIN_HASH_7_CHARS"

# === RBTE pilot branding
RBTE_PILOT_EDITION="2026-08-23.14"
NEXT_PUBLIC_RBTE_PILOT="Лидер трансформации"
ENVEOF

# Проверь — убедись что нет REPLACE_ME строк
cat .env.local | grep -E "REPLACE_|STRONG_PASSWORD" || echo "✅ REPLACE_ME отсутствуют — ОТЛИЧНО"
```

### Шаг 5. Проверка PostgreSQL extensions
Если у пользователя нет sudo → попроси админа (один раз) выполнить:
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE IF NOT EXISTS rbte_pilot OWNER rbte_pilot_user;
\c rbte_pilot
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgcrypto','uuid-ossp');
SQL
```

### Шаг 6. Запуск deploy.sh
```bash
cd ~/rbte
chmod +x repo/deploy/deploy.sh

export RBTE_DEPLOY_MODE=manual
export RBTE_ROOT="${HOME}/rbte"
export RBTE_LOGS="${HOME}/rbte-logs"

./repo/deploy/deploy.sh

# По окончании — smoke check:
sleep 4
echo "=== Direct Node port 3000 ==="
curl -sS -i http://127.0.0.1:3000/api/healthz | head -15
echo ""
echo "=== Via Nginx HTTPS ==="
curl -sS -i https://pilot.rbte.pro/api/healthz | head -15
```

### Шаг 7. Автозапуск при перезагрузке VPS (требует sudo ОДИН РАЗ)
Попроси админа VPS выполнить один раз:
```bash
# Под root или sudo-пользователем
pm2 startup systemd -u www-data -hp /home/www-data | sudo bash
sudo systemctl enable --now pm2-www-data.service
# Потом под www-data:
pm2 save
```

---

## 🔒 Режим Б: Системный /var/www deploy (если sudo появится позже)

Повторяет стандартную схему. Кратко:
```bash
sudo mkdir -p /var/www/rbte/{repo,current,previous} /var/log/rbte
sudo chown -R ${USER}:${USER} /var/www/rbte /var/log/rbte
sudo chmod 750 /var/www/rbte
export RBTE_ROOT="/var/www/rbte" RBTE_LOGS="/var/log/rbte"
# Далее шаги скопировать zip → unzip → .env.local → deploy.sh как в Режиме А
```

---

## 📌 Nginx sites-available — путь до проекта

Если Nginx конфиг `nginx.pilot.rbte.pro.conf` в upstream указывает `127.0.0.1:3000` — **ничего менять не нужно**, proxy_pass работает по порту и не зависит от пути к файлам проекта.

Если вдруг потребуется сервить Next.js static assets напрямую из Nginx — путь до current будет:
- Режим А HOME:  `/home/www-data/rbte/current/.next/static/`
- Режим Б:     `/var/www/rbte/current/.next/static/`

## 🚨 Проверка GitHub токена для Pack-TOC (перед deploy.sh)

```bash
cd ~/rbte/repo
set -a; source .env.local; set +a

node -e "
fetch('https://api.github.com/repos/Victor57618/Pack-TOC/contents/00-pack-manifest.md?ref='+process.env.PACK_TOC_COMMIT, {
  headers: {
    Authorization: 'Bearer ' + process.env.GITHUB_READ_TOKEN,
    'X-GitHub-Api-Version': '2022-11-28',
    Accept: 'application/vnd.github.raw+json'
  }
}).then(async r => {
  console.log('Статус:', r.status, r.statusText);
  console.log('RateLimit-осталось:', r.headers.get('x-ratelimit-remaining'));
  if (r.status===200) console.log('Прочитано байтов:', (await r.text()).length);
  else console.log('Ошибка тело:', await r.text().catch(e=>e.message));
}).catch(e=>console.error('Network:',e));
"
```
✅ **Успех = 200 + байтов > 0**. Если 404 — неверный PACK_TOC_COMMIT; если 401/403 — токен невалидный / скоуп не `repo`.
