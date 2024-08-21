## Benchmarking Test App

### Building for iOS

1. Build JS bundle for release

```sh
npm run build:ios:release
```

2. Target Release scheme in XCode: XCode > Product > Scheme > Edit Scheme > Build Configuration > Release
3. Create an archive of the app: XCode > Product > Archive
4. Extract the app from the xcarchive: Show Package Contents > Products > Applications > "AppName"
5. Place the Application in a folder named "Payload"
6. Zip the folder
7. Rename the zip to appName.ipa
