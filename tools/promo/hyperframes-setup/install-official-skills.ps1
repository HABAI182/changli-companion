$ErrorActionPreference = 'Stop'
$revision = '2905162d925fc87fb8242e24ed0bbf025d307ea1'
$names = @('hyperframes','hyperframes-animation','hyperframes-audio','hyperframes-cli','hyperframes-core','hyperframes-creative','hyperframes-keyframes','hyperframes-registry','hyperframes-studio','media-use','product-launch-video')
$stage = Join-Path $PSScriptRoot 'downloaded-skills'
$tree = Get-Content (Join-Path $PSScriptRoot 'skill-tree.json') -Raw | ConvertFrom-Json
$files = @($tree | Where-Object { ($_.path -split '/')[1] -in $names })
$results = $files | ForEach-Object -Parallel {
  $entry = $_
  $dest = Join-Path $using:stage ($entry.path.Substring(7))
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  for ($attempt=1; $attempt -le 3; $attempt++) {
    try {
      Invoke-WebRequest -Uri ('https://raw.githubusercontent.com/heygen-com/hyperframes/' + $using:revision + '/' + $entry.path) -OutFile $dest -TimeoutSec 35
      if ((Get-Item $dest).Length -ne $entry.size) { throw 'File size mismatch' }
      return [pscustomobject]@{path=$entry.path;ok=$true}
    } catch { if ($attempt -eq 3) { return [pscustomobject]@{path=$entry.path;ok=$false;error=$_.Exception.Message} } }
  }
} -ThrottleLimit 12
$results | ConvertTo-Json | Set-Content (Join-Path $PSScriptRoot 'download-report.json') -Encoding utf8
$failed = @($results | Where-Object { -not $_.ok })
if ($failed.Count) { $failed | Format-Table; throw ('Failed downloads: ' + $failed.Count) }
foreach ($name in $names) {
  $dest = Join-Path 'C:/Users/18769/.codex/skills' $name
  if (Test-Path $dest) { throw ('Destination already exists: ' + $dest) }
  if (-not (Test-Path (Join-Path $stage "$name/SKILL.md"))) { throw ('Missing SKILL.md: ' + $name) }
  Copy-Item -LiteralPath (Join-Path $stage $name) -Destination $dest -Recurse
  Write-Output "Installed $name"
}
Write-Output "Verified $($files.Count) official files at $revision"
