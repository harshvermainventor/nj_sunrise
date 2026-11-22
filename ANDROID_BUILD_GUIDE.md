# Apartment Visitor CRM — Free GitHub Actions Android APK & Local Phone Persistence Guide

## How Your Data Stays Safe on Your Phone (Even If You Delete the App)

When compiled into the Android APK using the included GitHub Actions workflow:
- **In-App Offline Database**: Every visitor, visit history, comment, follow-up, and apartment setting is saved locally in **IndexedDB + localStorage + CacheStorage**.
- **Auto-Synced Phone Documents File**: On every change you make inside the APK, the app automatically writes and updates:
  **`Phone Storage → Documents → ApartmentVisitorCRM → apartment-visitor-crm-data.json`**
- **Survives App Updates**: The GitHub Actions workflow caches the signing keystore (`avcrm-debug-keystore-v1`) and increments `versionCode` automatically, so installing a newer APK updates right over your existing app without losing your data.
- **Survives App Deletion**: If you ever uninstall/delete the app from your phone, Android keeps **`Documents/ApartmentVisitorCRM/apartment-visitor-crm-data.json`** safely on your phone. After reinstalling, the app checks `Documents/ApartmentVisitorCRM/` on launch—or you can tap **Apartment & Backup → Restore from Backup** and pick that file to restore everything in 1 second.

---

## Step-by-Step: Build Your Free Android `.apk` via GitHub Actions

1. **Download the Project ZIP** from AI Studio (menu → Download / Export project) and extract it on your computer or phone.
2. **Create a Free GitHub Repository** at [github.com/new](https://github.com/new) (public or private — GitHub includes free Actions minutes).
3. **Upload / Push All Files** (make sure the hidden `.github/workflows/build-android-apk.yml` folder & file are included!) to the **`main`** branch.
   - If uploading via the GitHub website, push via git or upload the `.github` folder too:
     ```bash
     git init
     git add .
     git commit -m "Apartment Visitor CRM"
     git branch -M main
     git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git
     git push -u origin main
     ```
4. **Download Your `.apk`**:
   - Open your repository on GitHub → click the **Actions** tab → click the latest **Build Free Android APK** run.
   - Scroll to **Artifacts** → download **`apartment-visitor-crm-apk`**.
   - Unzip it to get **`app-debug.apk`**, transfer it to your Android phone, and tap to install.

---

## Optional Local PC Build (Free with Android Studio)

```bash
npm install --legacy-peer-deps
npm run build
npm install --no-save --legacy-peer-deps @capacitor/cli@^8.0.0 @capacitor/android@^8.0.0
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`
