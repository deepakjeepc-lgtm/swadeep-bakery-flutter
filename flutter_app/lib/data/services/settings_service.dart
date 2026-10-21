import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/settings.dart';

class SettingsService {
  final FirebaseFirestore _firestore;

  SettingsService({required FirebaseFirestore firestore}) : _firestore = firestore;

  DocumentReference get _settingsDoc =>
      _firestore.collection('settings').doc('restaurant_info');

  Future<RestaurantSettings> getSettings() async {
    try {
      final doc = await _settingsDoc.get(const GetOptions(source: Source.serverAndCache));
      if (doc.exists && doc.data() != null) {
        return RestaurantSettings.fromMap(doc.data() as Map<String, dynamic>);
      }
    } catch (_) {}
    return RestaurantSettings();
  }

  Stream<RestaurantSettings> listenToSettings() {
    return _settingsDoc.snapshots().map((doc) {
      if (doc.exists && doc.data() != null) {
        return RestaurantSettings.fromMap(doc.data() as Map<String, dynamic>);
      }
      return RestaurantSettings();
    });
  }

  Future<void> updateSettings(RestaurantSettings settings) async {
    await _settingsDoc.set(settings.toMap(), SetOptions(merge: true));
  }
}
