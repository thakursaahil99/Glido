import 'package:flutter/foundation.dart';
import '../core/api_client.dart';

class PartnerUser {
  final String id;
  final String? name;
  final String? email;
  final String role;

  PartnerUser({required this.id, this.name, this.email, required this.role});

  factory PartnerUser.fromJson(Map<String, dynamic> json) =>
      PartnerUser(id: json['id'], name: json['name'], email: json['email'], role: json['role']);
}

class AuthState extends ChangeNotifier {
  PartnerUser? user;
  bool loading = true;

  Future<void> bootstrap() async {
    await ApiClient.instance.loadTokens();
    if (!ApiClient.instance.isLoggedIn) {
      loading = false;
      notifyListeners();
      return;
    }
    try {
      final me = await ApiClient.instance.get<Map<String, dynamic>>('/users/me');
      user = PartnerUser.fromJson(me);
    } catch (_) {
      user = null;
    }
    loading = false;
    notifyListeners();
  }

  Future<PartnerUser> login(String identifier, String password) async {
    final res = await ApiClient.instance.post<Map<String, dynamic>>('/auth/login', {
      'identifier': identifier,
      'password': password,
    });
    final loggedInUser = PartnerUser.fromJson(res['user']);
    if (loggedInUser.role != 'RESTAURANT_OWNER') {
      throw ApiException('This account is not a restaurant partner account.');
    }
    await ApiClient.instance.setTokens(res['accessToken'], res['refreshToken']);
    user = loggedInUser;
    notifyListeners();
    return user!;
  }

  Future<void> logout() async {
    await ApiClient.instance.clearTokens();
    user = null;
    notifyListeners();
  }
}
