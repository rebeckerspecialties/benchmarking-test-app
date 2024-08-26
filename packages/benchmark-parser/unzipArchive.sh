#!/bin/bash

artifactPath=$(find "./$1" -name "*Customer Artifacts.zip" | head -n 1)
echo $artifactPath

mkdir "$2"
unzip "$artifactPath" -d "$2/output" -x *.zip

find "$2/output" -name '*-clock.txt' | while read clockFile; do
  echo "$clockFile"
  mv "$clockFile" "$2"
done

rm -rf "$2/output"