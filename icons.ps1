param([string]$b64, [string]$out)
$ErrorActionPreference = 'Stop'
$path = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b64))
Add-Type -AssemblyName System.Drawing
if ($path.ToLower().EndsWith('.lnk')) {
    $sh = New-Object -ComObject WScript.Shell
    $sc = $sh.CreateShortcut($path)
    if ($sc.TargetPath -and (Test-Path $sc.TargetPath)) { $path = $sc.TargetPath }
}
$ico = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
if ($null -eq $ico) { exit 1 }
$bmp = $ico.ToBitmap()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose(); $ico.Dispose()
