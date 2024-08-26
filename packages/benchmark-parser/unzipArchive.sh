#!/bin/bash

artifactPath=$(find . -name '*Customer Artifacts.zip' | head -n 1)
echo $artifactPath
unzip "$artifactPath" -d "$1" -x *.zip

find "$1" -name '*-clock.txt' | while read clockFile; do
  echo "$clockFile"
done