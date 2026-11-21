/**
 * Capacitor configuration for native Android APK packaging.
 * See ANDROID_BUILD_GUIDE.md for build instructions.
 */
const config = {
  appId: 'com.personal.apartmentvisitorcrm',
  appName: 'Apartment Visitor CRM',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0B0F17',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2563EB',
    },
  },
};

export default config;
