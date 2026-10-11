$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$projectRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$output = Join-Path (Split-Path -Parent $projectRoot) 'changli-live2d-candidate-0.5.0-delivery-source.zip'
if (Test-Path -LiteralPath $output) { throw "目标源码包已存在：$output" }

$directories = @('src', 'src-tauri/src', 'src-tauri/icons', 'src-tauri/capabilities', 'public', 'tests', 'specs', 'qa', 'tools', 'vendor', 'art-workbench')
$singleFiles = @(
    'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src-tauri/tauri.conf.json', 'src-tauri/build.rs',
    '.gitignore', '.prettierignore', '.prettierrc.json',
    'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json',
    'README.md', 'ASSETS.md', 'ART-ASSET-REQUEST.md', 'TEST-REPORT.md', 'RELEASE-NOTES.md',
    'NEXT-CODEX-PROMPT.md', 'PHASE2-ENGINEERING-SPEC.md', 'MERGE-REVIEW.md', 'CODEX-HANDOFF.md',
    'HANDOFF-2026-09-24.md', 'THIRD-PARTY-NOTICES.md', 'Verify-Phase1.ps1', 'Verify-Phase1.cmd',
    'Start-Preview.cmd', 'Start-Desktop.cmd', 'Package-Phase2.ps1', 'Package-Phase3.ps1',
    'Package-Live2D-Runtime.ps1', 'CODEX_MASTER_PROMPT_LIVE2D.md',
    'ENGINEERING_HANDOFF.md', 'LIVE2D_INTEGRATION_GUIDE.md', 'ASSET_SPEC.md', 'TEST_REPORT.md'
)
$files = @($directories | ForEach-Object { Get-ChildItem -LiteralPath (Join-Path $projectRoot $_) -File -Recurse }) +
         @($singleFiles | ForEach-Object { Get-Item -LiteralPath (Join-Path $projectRoot $_) })
$zip = [System.IO.Compression.ZipFile]::Open($output, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($file in $files) {
        $entry = $file.FullName.Substring($projectRoot.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, $file.FullName, $entry, [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally { $zip.Dispose() }

$check = [System.IO.Compression.ZipFile]::OpenRead($output)
try {
    foreach ($required in @('src/App.tsx', 'src/renderer/live2d/CubismBackend.ts', 'src-tauri/src/main.rs', 'src-tauri/Cargo.toml', 'public/vendor/live2d/live2dcubismcore.min.js', 'vendor/live2d/src/live2dcubismframework.ts', 'vendor/live2d/CORE-LICENSE.md', 'LIVE2D_INTEGRATION_GUIDE.md', 'public/models/changli/live/ChangliCandidate.moc3', 'public/models/changli/live/ChangliCandidate.2048/texture_00.png', 'tools/live2d-authoring/build_candidate.py', 'tools/live2d-authoring/assets/closed-eyes-candidate.png')) {
        if (-not ($check.Entries | Where-Object FullName -EQ $required)) { throw "源码包缺少 $required" }
    }
    Write-Host "已验证 $($check.Entries.Count) 个文件：$output"
} finally { $check.Dispose() }
