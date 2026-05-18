# Native Android build (optional)

The PWA at `applywise-africa.vercel.app` is the primary mobile experience — students install it from the browser ("Add to Home Screen") and it works offline. **You don't need to do any of this** unless you want to ship to the Play Store.

## When to do it

- You want a Play Store listing.
- You need true background notifications (the current web Notifications only fire while the tab is open or a service worker is alive).
- You want OS-level integrations (deep links, share targets, camera roll).

## One-time setup

```sh
# Install the Capacitor deps (only when you're ready)
npm install --save-dev @capacitor/cli
npm install @capacitor/core @capacitor/android @capacitor/local-notifications @capacitor/haptics

# Add the Android platform (creates /android folder)
npm run cap:add:android
```

Requirements: Android Studio + JDK 17.

## Every-build flow

```sh
npm run cap:build   # vite build + sync into /android
npm run cap:open    # opens Android Studio so you can Run / Generate Signed APK
```

## What the wrapper changes

- `src/utils/notifications.ts` currently uses the Web Notifications API. When wrapped, swap `fire()` to call `LocalNotifications.schedule({...})` from `@capacitor/local-notifications` for true background reminders.
- `src/components/Celebrate.tsx` already calls `navigator.vibrate(...)`. Capacitor's `Haptics.impact({ style: ImpactStyle.Medium })` is a richer alternative on supported devices.

These are *opt-in* improvements — none of them are required for the wrap to work. The web build runs identically inside the WebView.

## Decision: do nothing yet

The scaffolding (`capacitor.config.ts`, `cap:*` scripts) is committed but zero Capacitor packages are in `package.json`. Until you run `npm install @capacitor/core ...`, nothing about the web build changes.
