import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

const String kApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000/api',
);

String get kApiOrigin => kApiBaseUrl.replaceAll(RegExp(r'/api/?$'), '');

String? resolveMediaUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '$kApiOrigin${url.startsWith('/') ? '' : '/'}$url';
}

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._internal() {
    _dio = Dio(BaseOptions(baseUrl: kApiBaseUrl, headers: {'Content-Type': 'application/json'}));
  }

  static final ApiClient instance = ApiClient._internal();
  late final Dio _dio;

  String? _accessToken;
  String? _refreshToken;

  Future<void> loadTokens() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('glido_partner_access_token');
    _refreshToken = prefs.getString('glido_partner_refresh_token');
  }

  bool get isLoggedIn => _accessToken != null;
  String? get accessToken => _accessToken;

  Future<void> setTokens(String access, String refresh) async {
    _accessToken = access;
    _refreshToken = refresh;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('glido_partner_access_token', access);
    await prefs.setString('glido_partner_refresh_token', refresh);
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('glido_partner_access_token');
    await prefs.remove('glido_partner_refresh_token');
  }

  Future<Response<dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? query,
    bool retry = true,
  }) async {
    try {
      return await _dio.request(
        path,
        data: data,
        queryParameters: query,
        options: Options(
          method: method,
          headers: _accessToken != null ? {'Authorization': 'Bearer $_accessToken'} : null,
        ),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 && retry && _refreshToken != null) {
        final refreshed = await _tryRefresh();
        if (refreshed) return _request(method, path, data: data, query: query, retry: false);
      }
      final message = (e.response?.data is Map) ? (e.response?.data['message'] ?? 'Something went wrong.') : 'Could not reach the server.';
      throw ApiException(message.toString(), e.response?.statusCode);
    }
  }

  Future<bool> _tryRefresh() async {
    try {
      final res = await _dio.post('/auth/refresh', data: {'refreshToken': _refreshToken});
      await setTokens(res.data['accessToken'], res.data['refreshToken']);
      return true;
    } catch (_) {
      await clearTokens();
      return false;
    }
  }

  Future<T> get<T>(String path, {Map<String, dynamic>? query}) async {
    final res = await _request('GET', path, query: query);
    return res.data as T;
  }

  Future<T> post<T>(String path, [Map<String, dynamic>? body]) async {
    final res = await _request('POST', path, data: body);
    return res.data as T;
  }

  Future<T> patch<T>(String path, [Map<String, dynamic>? body]) async {
    final res = await _request('PATCH', path, data: body);
    return res.data as T;
  }

  Future<T> delete<T>(String path) async {
    final res = await _request('DELETE', path);
    return res.data as T;
  }
}
