# Cloudflare setup script — creates only isolated QST Worker and D1.
# Run in a PowerShell session that is already authenticated to the correct Cloudflare account.
param([switch]$Deploy)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$acct='fb9597e74bae3ea18ad7bb013213d776'
$name='qst-living-knowledge-v1'
$db='qst-knowledge-v1-db'
$cfg='wrangler.jsonc'
Write-Host 'QST CLEAN DEPLOYMENT GATE' -ForegroundColor Cyan
Write-Host "Account: $acct"
Write-Host "New Worker: $name"
Write-Host "New D1: $db"
Write-Host 'Existing Workers and D1 databases will not be modified.'
if(!(Test-Path $cfg)){throw 'Wrangler config missing'}
if(!(Get-Command npm -ErrorAction SilentlyContinue)){throw 'Install Node.js LTS first'}
$raw=Get-Content $cfg -Raw
if($raw -notmatch [regex]::Escape($acct) -or $raw -notmatch [regex]::Escape($name) -or $raw -notmatch [regex]::Escape($db)){throw 'Account or isolated resource names do not match the locked manifest'}
Write-Host '\nInstalling project-specific Wrangler…'
& npm install --ignore-scripts
if($LASTEXITCODE -ne 0){throw 'npm install failed'}
Write-Host '\nChecking authenticated Cloudflare account…'
& npx wrangler whoami --account $acct
if($LASTEXITCODE -ne 0){throw 'Authentication or account membership verification failed'}
Write-Host '\nChecking that new Worker has never been deployed…'
# A successful deployments-list command means an existing Worker. STOP rather than overwrite it.
$prior=& npx wrangler deployments list --name $name 2>&1
$priorText=($prior | Out-String)
if($LASTEXITCODE -eq 0){throw "Worker $name already exists. STOP: refusing to overwrite an existing Worker."}
if($priorText -notmatch 'not found|does not exist|could not find|doesn.t exist|No Worker' ){throw "Could not conclusively prove Worker name is unused: $priorText"}
if($raw -notmatch 'REPLACE_WITH_NEW_D1_DATABASE_UUID'){throw 'Database ID already configured. STOP: refusing to create a second D1 or overwrite a deployment'}
Write-Host '\nCreating NEW D1 only…'
$out=& npx wrangler d1 create $db --location apac 2>&1
if($LASTEXITCODE -ne 0){throw "Database creation did not succeed: $out"}
$joined=($out | Out-String)
$guid=[regex]::Match($joined,'(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
if(!$guid.Success){throw "D1 may have been created but ID could not be parsed. STOP. Open Cloudflare D1 dashboard to retrieve UUID manually. Raw response: $joined"}
$raw=$raw.Replace('REPLACE_WITH_NEW_D1_DATABASE_UUID',$guid.Value)
Set-Content $cfg $raw -Encoding utf8
Write-Host "New D1 ID recorded: $($guid.Value)" -ForegroundColor Green
Write-Host '\nApplying migrations to NEW D1…'
& npx wrangler d1 migrations apply $db --remote
if($LASTEXITCODE -ne 0){throw 'Remote D1 migration failed. No deployment attempted.'}
Write-Host '\nChecking local source tests…'
& npm test
if($LASTEXITCODE -ne 0){throw 'Tests did not pass. No deployment attempted.'}
if(!$Deploy){Write-Host '\nSETUP ONLY PASS. New D1 created and seeded. Worker NOT deployed. Rerun with -Deploy after review.' -ForegroundColor Yellow;exit 0}
$confirmation=Read-Host "Type DEPLOY NEW QST to deploy $name to account $acct"
if($confirmation -cne 'DEPLOY NEW QST'){throw 'Deployment not approved; nothing deployed.'}
& npx wrangler deploy
if($LASTEXITCODE -ne 0){throw 'Worker deployment failed; inspect Wrangler output.'}
Write-Host '\nWorker deployed under the new name only. Admin remains LOCKED until Cloudflare Access is configured.' -ForegroundColor Green
