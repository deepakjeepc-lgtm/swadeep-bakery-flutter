import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/order.dart';

class LocalStorageService {
  static const String _keyCachedProducts = 'swadeep_cached_products';
  static const String _keyFavorites = 'swadeep_favorites';
  static const String _keyRecentOrders = 'swadeep_recent_orders';
  static const String _keyStaffSession = 'swadeep_staff_session';

  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  static Future<LocalStorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return LocalStorageService(prefs);
  }

  // Products Cache
  Future<void> saveProducts(List<Product> products) async {
    final list = products.map((p) => p.toMap()).toList();
    await _prefs.setString(_keyCachedProducts, jsonEncode(list));
  }

  List<Product> getCachedProducts() {
    final raw = _prefs.getString(_keyCachedProducts);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((e) => Product.fromMap(e as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  // Favorites
  Future<void> saveFavorites(List<String> favIds) async {
    await _prefs.setStringList(_keyFavorites, favIds);
  }

  List<String> getFavorites() {
    return _prefs.getStringList(_keyFavorites) ?? [];
  }

  // Recent Orders Cache
  Future<void> saveRecentOrders(List<Order> orders) async {
    final list = orders.map((o) => o.toMap()).toList();
    await _prefs.setString(_keyRecentOrders, jsonEncode(list));
  }

  List<Order> getRecentOrders() {
    final raw = _prefs.getString(_keyRecentOrders);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded
          .map((e) => Order.fromMap(e as Map<String, dynamic>, e['orderId']?.toString() ?? ''))
          .toList();
    } catch (_) {
      return [];
    }
  }

  // Staff Session
  Future<void> saveStaffSession(Map<String, dynamic> session) async {
    await _prefs.setString(_keyStaffSession, jsonEncode(session));
  }

  Map<String, dynamic>? getStaffSession() {
    final raw = _prefs.getString(_keyStaffSession);
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearStaffSession() async {
    await _prefs.remove(_keyStaffSession);
  }
}
