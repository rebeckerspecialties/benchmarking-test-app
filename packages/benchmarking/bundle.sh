#!/bin/bash

## Bundles benchmark.js to a tarball with it's own dependencies
mkdir dist
cp * dist/
cd dist
npm install
npx npm-bundle

## Extracts the npm bundle to a zip and cleans up the intermediate files
zip -r MyTests.zip *.tgz
mv MyTests.zip ..
cd ..
rm -rf dist