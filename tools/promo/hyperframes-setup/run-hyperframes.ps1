$env:HYPERFRAMES_NO_TELEMETRY = '1'
$env:HYPERFRAMES_BROWSER_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:HYPERFRAMES_FFMPEG_PATH = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../live2d-authoring/.venv/Lib/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'))
$env:HYPERFRAMES_FFPROBE_PATH = Join-Path $env:APPDATA 'npm/node_modules/@ffprobe-installer/win32-x64/ffprobe.exe'
$env:PATH = 'D:/Bili23 Downloader/bundle;' + (Split-Path $env:HYPERFRAMES_FFPROBE_PATH) + ';' + $env:PATH
& (Join-Path $env:APPDATA 'npm/hyperframes.cmd') @args
exit $LASTEXITCODE
