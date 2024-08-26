#!/bin/bash

artifactPath=$(find . -name "$1/*Customer Artifacts.zip" | head -n 1)
echo $artifactPath
unzip "$artifactPath" -d "$2" -x *.zip

find "$2" -name '*-clock.txt' | while read clockFile; do
  echo "$clockFile"
done