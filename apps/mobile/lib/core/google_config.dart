/// The Google OAuth Web client id — same one the website uses. Pass it at
/// build time: --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxx.apps.googleusercontent.com
/// (needed so the ID token google_sign_in returns on Android is verifiable by the backend).
const String kGoogleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
