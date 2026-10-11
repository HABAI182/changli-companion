$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$planFile = Join-Path $projectRoot 'CLEANUP-PLAN-20261007.json'
$plan = Get-Content -LiteralPath $planFile -Raw | ConvertFrom-Json
$workspaceRoot = (Resolve-Path -LiteralPath $plan.workspace).ProviderPath.TrimEnd('\')
$workspacePrefix = $workspaceRoot + '\'
$protectedHashes = @{}
foreach ($protectedPath in $plan.protectedFiles) {
    if (-not (Test-Path -LiteralPath $protectedPath -PathType Leaf)) { throw "Protected file missing: $protectedPath" }
    $protectedHashes[$protectedPath] = (Get-FileHash -LiteralPath $protectedPath -Algorithm SHA256).Hash
}
if ($protectedHashes[$plan.currentRecoveryVerified.archive] -ne $plan.currentRecoveryVerified.sha256) {
    throw 'Latest recovery archive changed after validation'
}

# Check all absolute targets and all reparse boundaries before any deletion.
foreach ($row in $plan.paths) {
    $targetPath = (Resolve-Path -LiteralPath $row.path).ProviderPath
    if (-not $targetPath.StartsWith($workspacePrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Outside project workspace: $targetPath"
    }
    $cursor = $targetPath
    while ($cursor.Length -gt $workspaceRoot.Length) {
        $item = Get-Item -LiteralPath $cursor -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse boundary: $cursor" }
        $cursor = Split-Path -Parent $cursor
    }
    foreach ($protectedPath in @($plan.protectedFiles) + @($plan.protectedDirectories)) {
        if ($protectedPath.Equals($targetPath, [StringComparison]::OrdinalIgnoreCase) -or
            $protectedPath.StartsWith($targetPath.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw "Deletion would include protected content: $targetPath"
        }
    }
}

$freeBefore = (Get-PSDrive -Name C).Free
$deleted = [Collections.Generic.List[object]]::new()
$failed = [Collections.Generic.List[object]]::new()
foreach ($row in $plan.paths) {
    try {
        Remove-Item -LiteralPath $row.path -Force -Recurse -ErrorAction Stop
        $deleted.Add($row)
    } catch {
        $failed.Add([ordered]@{path=$row.path;error=$_.Exception.Message})
    }
}
foreach ($protectedPath in $protectedHashes.Keys) {
    if ((Get-FileHash -LiteralPath $protectedPath -Algorithm SHA256).Hash -ne $protectedHashes[$protectedPath]) {
        throw "Protected file changed during cleanup: $protectedPath"
    }
}
$freeAfter = (Get-PSDrive -Name C).Free
$result = [ordered]@{
    completedAt = (Get-Date).ToString('o')
    workspace = $workspaceRoot
    freeBytesBefore = $freeBefore
    freeBytesAfter = $freeAfter
    observedFreeBytesIncrease = $freeAfter - $freeBefore
    deletedLogicalBytes = ($deleted | Measure-Object -Property bytes -Sum).Sum
    deletedPaths = @($deleted.ToArray())
    failures = @($failed.ToArray())
    protectedHashesVerified = $true
}
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $projectRoot 'CLEANUP-RESULT-20261007.json') -Encoding utf8
[ordered]@{
    deletedPaths=$deleted.Count
    failures=$failed.Count
    reclaimedGiB=[math]::Round(($freeAfter-$freeBefore)/1GB,2)
    freeGiB=[math]::Round($freeAfter/1GB,2)
    protectedHashesVerified=$true
} | ConvertTo-Json
