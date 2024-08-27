#!/bin/bash

for dir in $1/*
do
  artifactPath=$(find "$dir" -name "*Customer Artifacts.zip" | head -n 1)
  deviceType=${dir##*/}
  echo $deviceType

  mkdir -p "$2/$deviceType"
  unzip "$artifactPath" -d "$2/$deviceType/output" -x *.zip

  find "$2/$deviceType/output" -name '*-*.txt' | while read benchmarkFile; do
    echo "$benchmarkFile"
    mv "$benchmarkFile" "$2/$deviceType"
  done

  rm -rf "$2/$deviceType/output"
done;