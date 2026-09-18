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

  Future<void> logout() async {
    await ApiClient.instance.clearTokens();
    user = null;
    notifyListeners();
  }
}
