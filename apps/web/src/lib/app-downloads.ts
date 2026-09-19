// Bump this on every APK rebuild — browsers/Android otherwise cache a download
// by URL and can silently keep serving an old APK on "re-download".
const APK_VERSION = "20260919-1";

export const APP_DOWNLOADS = {
  customer: `/downloads/glido-customer.apk?v=${APK_VERSION}`,
  delivery: `/downloads/glido-delivery-partner.apk?v=${APK_VERSION}`,
  restaurantPartner: `/downloads/glido-restaurant-partner.apk?v=${APK_VERSION}`,
} as const;
