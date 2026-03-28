param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$UserId = 16,
    [string]$Jwt,
    [double]$DistanceM = 150,
    [string]$Timestamp = "",
    [double]$Lat = 17.385044,
    [double]$Lon = 78.486671
)

if ([string]::IsNullOrWhiteSpace($Jwt)) {
    Write-Error "Jwt is required."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Timestamp)) {
    $Timestamp = (Get-Date).ToUniversalTime().ToString("o")
}

$uri = "$BaseUrl/api/attendance/away"
$headers = @{
    "Authorization" = "Bearer $Jwt"
    "Content-Type"  = "application/json"
}

$body = @{
    user_id    = $UserId
    distance_m = $DistanceM
    timestamp  = $Timestamp
    lat        = $Lat
    lon        = $Lon
} | ConvertTo-Json -Depth 5

Write-Host "POST $uri"
Write-Host "Payload: $body"

try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $body
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Error $_
    exit 1
}
