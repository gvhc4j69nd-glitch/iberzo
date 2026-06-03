# App Icons

Generated from `public/iberzo-logo.png` (1024×1024).

## iOS — Xcode

1. Open Xcode: `npx cap open ios` (from `client/`)
2. In the Project Navigator open:  
   `App → App → Assets.xcassets → AppIcon.appiconset`
3. Delete all placeholder slots
4. Drag all files from `icons/ios/` into the AppIcon set
5. Copy `icons/ios/Contents.json` into the `AppIcon.appiconset` folder  
   (replaces the existing Contents.json)

## Android — Android Studio

1. Open Android Studio: `npx cap open android` (from `client/`)
2. In the file tree, navigate to `app/src/main/res/`
3. Replace the contents of each `mipmap-*` folder with the matching folder from `icons/android/`
4. For the Play Store listing, upload `icons/android/playstore/ic_launcher.png` (512×512)

## After any app code update

```bash
cd client
npm run build
npx cap sync
```
Then rebuild in Xcode / Android Studio.
