#!/bin/bash
set -e

files=$(python - << "EOF"
from pathlib import Path

files = []

def scan(folder: Path, path: str = ""):
    for file in folder.iterdir():
        if file.is_dir():
            scan(file, f"{path}/{file.name}")
        else:
            files.append(f"{path}/{file.name}")

scan(Path("./dist"))
print("-F " + " -F ".join(f"{name}=@dist{name}" for name in files))
EOF
)

code=$(curl -X POST --silent --output /dev/stderr --write-out "%{http_code}" -H "Authorization: ${DEPLOY_TOKEN}" $files https://akarys.me/upload)
if [ $code -ne 204 ]; then
  echo "Server returned code $code"
  exit 1
fi
