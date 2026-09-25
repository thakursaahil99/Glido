import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/user.dart';

class AuthState extends ChangeNotifier {
  GlidoUser? user;
  bool loading = true;

  Future<void> bootstrap() async {
    await ApiClient.instance.loadTokens();
    await refreshUser();
  }

  Future<void> refreshUser() async {
    if (!ApiClient.instance.isLoggedIn) {
      user = null;
      loading = false;
      notifyListeners();
      return;
    }
    try {
      final me = await ApiClient.instance.get<Map<String, dynamic>>('/users/me');
      user = GlidoUser.fromJson(me);
    } catch (_) {
      user = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<GlidoUser> login(String identifier, String password) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>('/auth/login', {
      'identifier': identifier,
      'password': password,
    });
    await ApiClient.instance.setTokens(res['accessToken'], res['refreshToken']);
    user = GlidoUser.fromJson(res['user']);
    notifyListeners();
    return user!;
  }

  Future<GlidoUser> googleLogin(String idToken, {String? referralCode}) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>('/auth/google', {
      'idToken': idToken,
      if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
    });
    await ApiClient.instance.setTokens(res['accessToken'], res['refreshToken']);
    user = GlidoUser.fromJson(res['user']);
    notifyListeners();
    return user!;
  }

  Future<GlidoUser> register(String name, String identifier, String password) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>('/auth/register', {
      'name': name,
      'identifier': identifier,
      'password': password,
    });
    await ApiClient.instance.setTokens(res['accessToken'], res['refreshToken']);
    user = GlidoUser.fromJson(res['user']);
    notifyListeners();
    return user!;
  }

  /// Step 1 of email-OTP signup — sends a code to [email]; the account isn't
  /// created yet, so this doesn't touch AuthState.user.
  Future<void> requestRegistrationOtp(String name, String email, String phone, String password) async {
    await ApiClient.instance.post<Map<String, dynamic>>('/auth/register/request-otp', {
      'name': name,
      'email': email,
      'phone': phone,
      'password': password,
    });
  }

  /// Step 2 — verifying the code actually creates the account and logs in.
  Future<GlidoUser> verifyRegistration(String email, String code) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>('/auth/register/verify', {
      'email': email,
      'code': code,
    });
    await ApiClient.instance.setTokens(res['accessToken'], res['refreshToken']);
    user = GlidoUser.fromJson(res['user']);
    notifyListeners();
    return user!;
  }

  Future<void> logout() async {
    await ApiClient.instance.clearTokens();
    user = null;
    notifyListeners();
  }
}
