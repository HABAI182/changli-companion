param(
    [switch]$Package
)

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# A running terminal may predate rustup's user PATH update.
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
if (Test-Path (Join-Path $cargoBin 'cargo.exe')) { $env:Path = "$cargoBin;$env:Path" }

$failed = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

function Has-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Run-Step([string]$Name, [scriptblock]$Action) {
    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    try { & $Action } catch {
        $failed.Add($Name)
        Write-Host "[FAIL] $Name : $_" -ForegroundColor Red
        return
    }
    if ($LASTEXITCODE -ne 0) {
        $failed.Add($Name)
        Write-Host "[FAIL] $Name (exit $LASTEXITCODE)" -ForegroundColor Red
    } else {
        Write-Host "[PASS] $Name" -ForegroundColor Green
    }
}

Write-Host "离火长明 · Phase 1 本机验证" -ForegroundColor Yellow
Write-Host "Project: $root"
Write-Host "Windows: $([Environment]::OSVersion.VersionString)"

if (-not (Has-Command 'node') -or -not (Has-Command 'npm')) {
    $skipped.Add('前端检查：缺少 Node/npm')
    Write-Host "`n[SKIP] 缺少 Node/npm，无法执行前端检查。" -ForegroundColor Yellow
} else {
    node --version
    npm --version
    if (-not (Test-Path (Join-Path $root 'node_modules'))) {
        Write-Host "`nnode_modules 不存在，先执行 npm ci。" -ForegroundColor Yellow
        Run-Step 'npm ci' { npm ci }
    }
    if (Test-Path (Join-Path $root 'node_modules')) {
        Run-Step 'TypeScript' { npm run typecheck }
        Run-Step '单元测试' { npm test }
        Run-Step 'Prettier' { npm run format:check }
        Run-Step '前端构建' { npm run build }
    }
}

$hasRust = (Has-Command 'rustc') -and (Has-Command 'cargo')
if (-not $hasRust) {
    $skipped.Add('Rust 原生检查：缺少 rustc/cargo')
    Write-Host "`n[SKIP] 缺少 Rust 工具链。README 中有 rustup 安装命令。" -ForegroundColor Yellow
} else {
    rustc --version
    cargo --version
    Run-Step 'Rustfmt' { cargo fmt --manifest-path src-tauri/Cargo.toml --check }
    Run-Step 'Rust 单元测试/编译' { cargo test --manifest-path src-tauri/Cargo.toml --locked }
    if (Has-Command 'npm') {
        Run-Step 'Tauri 环境信息' { npm run tauri info }
        if ($Package) {
            Run-Step 'Windows NSIS 打包' { npm run package:windows }
        } else {
            $skipped.Add('Windows NSIS 打包：未传入 -Package')
        }
    }
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (Test-Path $vswhere) {
    $vcPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vcPath) {
        Write-Host "`nVisual Studio C++ Build Tools: $vcPath" -ForegroundColor Green
    } else {
        $skipped.Add('MSVC：未检测到 VC.Tools.x86.x64')
        Write-Host "`n[WARN] 未检测到 C++ Build Tools 工作负载。" -ForegroundColor Yellow
    }
} else {
    $skipped.Add('MSVC：未找到 vswhere')
    Write-Host "`n[WARN] 未找到 Visual Studio Installer/vswhere。" -ForegroundColor Yellow
}

$kits = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\Include'
if (Test-Path $kits) {
    $sdk = Get-ChildItem $kits -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($sdk) { Write-Host "Windows SDK Include: $($sdk.FullName)" -ForegroundColor Green }
} else {
    $skipped.Add('Windows SDK 10/11：未检测到 Include 目录')
    Write-Host "[WARN] 未检测到 Windows 10/11 SDK Include 目录。" -ForegroundColor Yellow
}

Write-Host "`n=== 汇总 ===" -ForegroundColor Cyan
if ($failed.Count -eq 0) {
    Write-Host '没有已执行检查失败。' -ForegroundColor Green
} else {
    Write-Host ('失败：' + ($failed -join '；')) -ForegroundColor Red
}
if ($skipped.Count -gt 0) {
    Write-Host ('跳过/警告：' + ($skipped -join '；')) -ForegroundColor Yellow
}
Write-Host '原生透明、全局 hook、IME、不抢焦点、跨 DPI、多屏断开恢复、穿透恢复仍需人工实机验收。'

if ($failed.Count -gt 0) { exit 1 }
if ($skipped.Count -gt 0) { exit 2 }
exit 0
