if (Test-Path "./bin") {
  Remove-Item -Recurse -Force "./bin"
}

mkdir "./bin" > $null

node --experimental-sea-config "./sea-config.json"

node -e "require('fs').copyFileSync(process.execPath, './bin/app.exe')" 
signtool remove /s "./bin/app.exe"

npx postject "./bin/app.exe" NODE_SEA_BLOB "./bin/sea-prep.blob" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 
