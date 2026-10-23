import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import '../models/order.dart';
import 'local_storage_service.dart';

class OrderService {
  final FirebaseFirestore _firestore;
  final LocalStorageService _storage;

  OrderService({
    required FirebaseFirestore firestore,
    required LocalStorageService storage,
  })  : _firestore = firestore,
        _storage = storage;

  CollectionReference get _ordersCol => _firestore.collection('orders');

  /// Creates a new customer order
  Future<Order> placeOrder(Order order) async {
    final docRef = _ordersCol.doc(order.id);
    final data = {
      ...order.toMap(),
      'createdAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    };

    await docRef.set(data);

    // Save to local cache of recent orders
    final current = _storage.getRecentOrders();
    current.insert(0, order);
    await _storage.saveRecentOrders(current);

    return order;
  }

  /// Single bounded stream for active orders (strictly limited to latest 25 docs to prevent quota exhaustion)
  Stream<List<Order>> listenToRecentOrders() {
    return _ordersCol
        .orderBy('createdAt', descending: true)
        .limit(25)
        .snapshots()
        .map((snapshot) {
      final List<Order> list = snapshot.docs.map<Order>((doc) {
        return Order.fromMap(doc.data() as Map<String, dynamic>, doc.id);
      }).toList();

      _storage.saveRecentOrders(list);
      return list;
    });
  }

  /// Single document stream for order tracking by customer
  Stream<Order?> trackOrder(String orderId) {
    return _ordersCol.doc(orderId).snapshots().map((doc) {
      if (!doc.exists || doc.data() == null) return null;
      return Order.fromMap(doc.data() as Map<String, dynamic>, doc.id);
    });
  }

  /// Updates status of an order
  Future<void> updateOrderStatus({
    required String orderId,
    required OrderStatus status,
    Map<String, dynamic>? additionalFields,
  }) async {
    final data = <String, dynamic>{
      'status': status.toDbValue(),
      'updatedAt': FieldValue.serverTimestamp(),
      if (additionalFields != null) ...additionalFields,
    };
    await _ordersCol.doc(orderId).update(data);
  }
}
