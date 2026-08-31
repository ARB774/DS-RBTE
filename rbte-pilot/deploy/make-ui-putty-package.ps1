$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$zipPath = Join-Path $projectRoot "rbte-ui-redesign.zip"
$outputPath = Join-Path $projectRoot "rbte-ui-redesign-putty.txt"

if (-not (Test-Path -LiteralPath $zipPath)) {
  throw "Archive not found: $zipPath"
}

$archiveBytes = [IO.File]::ReadAllBytes($zipPath)
$archiveBase64 = [Convert]::ToBase64String($archiveBytes)
$archiveHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$chunkLength = 45600
$chunks = [System.Collections.Generic.List[string]]::new()

for ($offset = 0; $offset -lt $archiveBase64.Length; $offset += $chunkLength) {
  $length = [Math]::Min($chunkLength, $archiveBase64.Length - $offset)
  $chunks.Add($archiveBase64.Substring($offset, $length))
}

$newline = "`n"
$text = [Text.StringBuilder]::new()

[void]$text.Append(@"
======================================================================
RBTE UI REDESIGN — ПАКЕТ ДЛЯ ЗАГРУЗКИ ЧЕРЕЗ PUTTY
======================================================================
Архив: rbte-ui-redesign.zip
Размер: $($archiveBytes.Length) байт
SHA256: $archiveHash
Блоков Base64: $($chunks.Count)

ВАЖНО:
1. Подключитесь к pilot.rbte.pro через PuTTY.
2. Лучше использовать root-сессию; скрипт сам найдёт deployrbte/www-data.
3. Вставляйте команды по порядку. Каждый блок должен завершиться строкой EOF.

======================================================================
ШАГ 1. ОЧИСТИТЬ ВРЕМЕННЫЙ ФАЙЛ
======================================================================
rm -f /tmp/rbte-ui-redesign.b64 /tmp/rbte-ui-redesign.zip
touch /tmp/rbte-ui-redesign.b64

"@)

for ($index = 0; $index -lt $chunks.Count; $index++) {
  $number = $index + 1
  $marker = "RBTE_UI_EOF_$($number.ToString('00'))"
  [void]$text.Append("======================================================================$newline")
  [void]$text.Append("ШАГ 2.$number. ВСТАВИТЬ БЛОК $number ИЗ $($chunks.Count)$newline")
  [void]$text.Append("======================================================================$newline")
  [void]$text.Append("cat >> /tmp/rbte-ui-redesign.b64 <<'$marker'$newline")
  for ($lineOffset = 0; $lineOffset -lt $chunks[$index].Length; $lineOffset += 76) {
    $lineLength = [Math]::Min(76, $chunks[$index].Length - $lineOffset)
    [void]$text.Append($chunks[$index].Substring($lineOffset, $lineLength) + $newline)
  }
  [void]$text.Append("$marker$newline")
  [void]$text.Append("wc -c /tmp/rbte-ui-redesign.b64$newline$newline")
}

[void]$text.Append(@"
======================================================================
ШАГ 3. ДЕКОДИРОВАТЬ И ПРОВЕРИТЬ АРХИВ
======================================================================
base64 -d /tmp/rbte-ui-redesign.b64 > /tmp/rbte-ui-redesign.zip
test "`$(stat -c%s /tmp/rbte-ui-redesign.zip)" = "$($archiveBytes.Length)" || { echo "ОШИБКА: неверный размер архива"; exit 1; }
echo "$archiveHash  /tmp/rbte-ui-redesign.zip" | sha256sum -c -
unzip -l /tmp/rbte-ui-redesign.zip

======================================================================
ШАГ 4. СОЗДАТЬ И ЗАПУСТИТЬ БЕЗОПАСНЫЙ СКРИПТ ПУБЛИКАЦИИ
======================================================================
cat > /tmp/rbte-apply-ui.sh <<'RBTE_APPLY_EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

PACKAGE=/tmp/rbte-ui-redesign.zip

detect_installation() {
  if [ -f /home/deployrbte/rbte/repo/package.json ]; then
    RBTE_OWNER=deployrbte
    RBTE_ROOT=/home/deployrbte/rbte
  elif [ -f /home/www-data/rbte/repo/package.json ]; then
    RBTE_OWNER=www-data
    RBTE_ROOT=/home/www-data/rbte
  elif [ -f "`$HOME/rbte/repo/package.json" ]; then
    RBTE_OWNER="`$(id -un)"
    RBTE_ROOT="`$HOME/rbte"
  else
    echo "ОШИБКА: не найден RBTE repo (ожидался ~/rbte/repo/package.json)."
    exit 1
  fi
  export RBTE_OWNER RBTE_ROOT
}

detect_installation

if [ "`$(id -un)" != "`$RBTE_OWNER" ]; then
  if [ "`$(id -u)" -ne 0 ]; then
    echo "ОШИБКА: войдите как root или `$(printf '%s' "`$RBTE_OWNER")."
    exit 1
  fi
  exec runuser -u "`$RBTE_OWNER" -- env \
    RBTE_ROOT="`$RBTE_ROOT" \
    PACKAGE="`$PACKAGE" \
    bash "`$0" --as-owner
fi

REPO="`$RBTE_ROOT/repo"
CURRENT="`$RBTE_ROOT/current"
PREVIOUS="`$RBTE_ROOT/previous"
LOGS="`$RBTE_ROOT/../rbte-logs"
STAMP="`$(date +%Y%m%d-%H%M%S)"
BACKUP="`$RBTE_ROOT/ui-backups/`$STAMP"

mkdir -p "`$BACKUP" "`$LOGS"

for RELATIVE_PATH in app/globals.css app/layout.tsx app/page.tsx public/og.png; do
  if [ -f "`$REPO/`$RELATIVE_PATH" ]; then
    mkdir -p "`$BACKUP/`$(dirname "`$RELATIVE_PATH")"
    cp -a "`$REPO/`$RELATIVE_PATH" "`$BACKUP/`$RELATIVE_PATH"
  fi
done

echo "Резервная копия UI: `$BACKUP"
unzip -q -o "`$PACKAGE" -d "`$REPO"

cd "`$REPO"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=3072"
rm -rf .next

echo "Сборка Next.js..."
node ./node_modules/next/dist/bin/next build 2>&1 | tee /tmp/rbte-ui-build.log

echo "Копирование CSS, JS и public в standalone..."
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static .next/standalone/public
cp -a .next/static .next/standalone/.next/static
if [ -d public ]; then
  cp -a public .next/standalone/public
fi
test -d .next/standalone/.next/static/css

echo "Публикация blue-green..."
cd "`$RBTE_ROOT"
if [ -d "`$PREVIOUS" ]; then
  mv "`$PREVIOUS" "`$BACKUP/previous-before-ui"
fi
if [ -d "`$CURRENT" ]; then
  mv "`$CURRENT" "`$PREVIOUS"
fi
mkdir -p "`$CURRENT"
rsync -a --delete \
  --exclude='.git' \
  --exclude='.next/cache' \
  --exclude='node_modules/.cache' \
  "`$REPO/" "`$CURRENT/"

if [ -f "`$REPO/.env.local" ]; then
  cp "`$REPO/.env.local" "`$CURRENT/.env.local"
  chmod 600 "`$CURRENT/.env.local"
fi

cd "`$CURRENT"
export RBTE_ROOT
export RBTE_LOGS="`$LOGS"
pm2 startOrReload deploy/ecosystem.config.js --env production --update-env
pm2 save
sleep 5

echo "Локальная проверка:"
curl -fsS --max-time 10 http://127.0.0.1:3000/api/healthz
echo
echo "Публичная проверка:"
curl -fsS --max-time 15 https://pilot.rbte.pro/api/healthz
echo
pm2 status rbte-pilot

echo "ГОТОВО. UI опубликован."
echo "Резервная копия: `$BACKUP"
echo "Для отката используйте каталог: `$PREVIOUS"
RBTE_APPLY_EOF

chmod 700 /tmp/rbte-apply-ui.sh
bash /tmp/rbte-apply-ui.sh

======================================================================
ШАГ 5. ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА В БРАУЗЕРЕ/ТЕРМИНАЛЕ
======================================================================
curl -fsS https://pilot.rbte.pro/ | grep -o 'От сложной рабочей ситуации' | head -1
curl -fsSI https://pilot.rbte.pro/og.png | head -12

Если обе команды возвращают данные без ошибки, загрузка завершена.
======================================================================
"@)

[IO.File]::WriteAllText($outputPath, $text.ToString(), [Text.UTF8Encoding]::new($false))

$outputFile = Get-Item -LiteralPath $outputPath
Write-Output "Created: $($outputFile.FullName)"
Write-Output "Text size: $($outputFile.Length) bytes"
Write-Output "ZIP SHA256: $archiveHash"
