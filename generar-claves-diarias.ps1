$ErrorActionPreference = 'Stop'

function Get-AccessCode {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Secret
    )

    $today = Get-Date
    $year = $today.Year
    $dayOfYear = [int]$today.DayOfYear
    $seed = "$Secret-$year-$dayOfYear"

    $hashUnsigned = [uint32]0
    $mask32 = [uint64]4294967295
    foreach ($c in $seed.ToCharArray()) {
        $charCode = [uint32][int][char]$c
        $hashUnsigned = [uint32]((([uint64]$hashUnsigned * 31) + [uint64]$charCode) -band $mask32)
    }

    $hashSigned = if ($hashUnsigned -gt [uint32]0x7fffffff) {
        [int64]$hashUnsigned - 0x100000000
    } else {
        [int64]$hashUnsigned
    }

    $code = [Math]::Abs($hashSigned % 100000)
    return $code.ToString('D5')
}

$baseUrl = 'https://homestyle507.github.io/Catalogo'
$resellerPath = 'Revendedores'
$resellerSecret = 'HS507-REV'

Write-Host ""
Write-Host "CLAVE REVENDEDORES DEL DIA: $(Get-Date -Format 'yyyy-MM-dd')" -ForegroundColor Cyan
Write-Host ""

$key = Get-AccessCode -Secret $resellerSecret
$url = "$baseUrl/$resellerPath/?k=$key"
Write-Host ("Revendedores  clave: {0}  url: {1}" -f $key, $url)

Write-Host ""
Write-Host "Tip: ejecuta este archivo cada dia para obtener la clave nueva de revendedores." -ForegroundColor DarkGray
