# Float Launcher

A React Native app for Vivo Y11 (Android) that lets you open apps like Roblox with a draggable floating bubble on your screen.

## How it works

- Open Float Launcher
- Grant "Display over other apps" permission when prompted
- Tap **Float** next to any app (Roblox, YouTube, etc.)
- The app opens, and a draggable bubble appears on screen
- Tap the bubble anytime to bring that app to the front
- Tap **Close** in Float Launcher to remove the bubble

## Getting the APK via GitHub Actions

1. Push this repo to GitHub (make it public or use GitHub Free)
2. Go to **Actions** tab in your repo
3. The **Build APK** workflow runs automatically on every push
4. When it finishes, click the run -> scroll to **Artifacts** -> download **FloatLauncher-debug-apk**
5. Transfer the APK to your Vivo Y11 and install it
   - Enable "Install from unknown sources" in Settings if prompted

## Adding more apps

Edit `src/App.tsx` and add to the `DEFAULT_APPS` array:

```js
{
  id: '9',
  name: 'Your App Name',
  packageName: 'com.example.yourapp',  // find this in Play Store URL
  color: '#your-color',
  initial: 'Y',
}
```

Then push to GitHub and download the new APK from Actions.

## Permission required

**Display over other apps** (`SYSTEM_ALERT_WINDOW`) — this is what lets the floating bubble appear on top of Roblox or any other app. You grant it once in Settings.

## Minimum Android version

Android 6.0 (API 23) and above. Vivo Y11 runs Android 9 so it works fine.
