#!/bin/bash

# Iterates over all AWS Device Farm artifacts, unzips benchmark results,
# and exports results to a target directory

#### Arguments
## $1: path to archive containing AWS device farm results
## $2: output directory for unzipped result files
####

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

  find "$2/$deviceType/output" -name '*.xml' | while read benchmarkFile; do
    echo "$benchmarkFile"
    mv "$benchmarkFile" "$2/$deviceType"
  done

  rm -rf "$2/$deviceType/output"
done;
