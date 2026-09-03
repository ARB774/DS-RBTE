$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$zipPath = Join-Path $projectRoot "rbte-seed-fix.zip"
$outputPath = Join-Path $projectRoot "rbte-seed-fix-putty.txt"
$files = @(
  "app/actions/auth.ts",
  "app/login/page.tsx",
  "app/api/healthz/route.ts",
  "lib/db.ts",
  "db/index.ts",
  "db/schema.ts",
  "drizzle/0000_init.sql",
  "drizzle/0001_users_identity.sql",
  "drizzle/0002_lucia_v3_sessions.sql",
  "deploy/deploy.sh"
)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relativePath in $files) {
    $sourcePath = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath)) {
      throw "Missing package file: $sourcePath"
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $sourcePath,
      $relativePath.Replace("\\", "/"),
      [IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $zip.Dispose()
}

$archiveBytes = [IO.File]::ReadAllBytes($zipPath)
$archiveBase64 = [Convert]::ToBase64String($archiveBytes)
$archiveHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
$newline = "`n"
$text = [Text.StringBuilder]::new()

[void]$text.Append(@"
RBTE — ИСПРАВЛЕНИЕ SEED И ПОДКЛЮЧЕНИЯ К БАЗЕ
============================================================
Вставьте весь блок ниже в PuTTY из root-сессии.

cat > /tmp/rbte-seed-fix.b64 <<'RBTE_SEED_ARCHIVE_EOF'
"@)
[void]$text.Append($newline)

for ($offset = 0; $offset -lt $archiveBase64.Length; $offset += 76) {
  $length = [Math]::Min(76, $archiveBase64.Length - $offset)
  [void]$text.Append($archiveBase64.Substring($offset, $length) + $newline)
}

[void]$text.Append(@"
RBTE_SEED_ARCHIVE_EOF
base64 -d /tmp/rbte-seed-fix.b64 > /tmp/rbte-seed-fix.zip
echo "$archiveHash  /tmp/rbte-seed-fix.zip" | sha256sum -c -

cat > /tmp/rbte-apply-seed-fix.sh <<'RBTE_SEED_APPLY_EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

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
  echo "ERROR: RBTE repository not found."
  exit 1
fi

if [ "`$(id -un)" != "`$RBTE_OWNER" ]; then
  if [ "`$(id -u)" -ne 0 ]; then
    echo "ERROR: run as root or `$RBTE_OWNER."
    exit 1
  fi
  chmod 755 "`$0"
  exec runuser -u "`$RBTE_OWNER" -- env RBTE_ROOT="`$RBTE_ROOT" bash "`$0" --as-owner
fi

REPO="`$RBTE_ROOT/repo"
STAMP="`$(date +%Y%m%d-%H%M%S)"
BACKUP="`$RBTE_ROOT/seed-fix-backups/`$STAMP"
mkdir -p "`$BACKUP"

for FILE in \
  app/actions/auth.ts \
  app/login/page.tsx \
  app/api/healthz/route.ts \
  lib/db.ts \
  db/index.ts \
  db/schema.ts \
  drizzle/0000_init.sql \
  drizzle/0001_users_identity.sql \
  deploy/deploy.sh; do
  if [ -f "`$REPO/`$FILE" ]; then
    mkdir -p "`$BACKUP/`$(dirname "`$FILE")"
    cp -a "`$REPO/`$FILE" "`$BACKUP/`$FILE"
  fi
done

unzip -q -o /tmp/rbte-seed-fix.zip -d "`$REPO"
chmod 755 "`$REPO/deploy/deploy.sh"
export RBTE_ROOT
bash "`$REPO/deploy/deploy.sh"

echo "SEED FIX PUBLISHED"
echo "Backup: `$BACKUP"
RBTE_SEED_APPLY_EOF

chmod 755 /tmp/rbte-apply-seed-fix.sh
bash /tmp/rbte-apply-seed-fix.sh

После строки SEED FIX PUBLISHED обновите страницу входа через Ctrl+F5.
После нажатия Seed появится зелёное подтверждение.
============================================================
"@)

[IO.File]::WriteAllText($outputPath, $text.ToString(), [Text.UTF8Encoding]::new($false))

Write-Output "Created: $outputPath"
Write-Output "ZIP size: $($archiveBytes.Length) bytes"
Write-Output "TXT size: $((Get-Item -LiteralPath $outputPath).Length) bytes"
Write-Output "ZIP SHA256: $archiveHash"
