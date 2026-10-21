import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product.dart';
import 'local_storage_service.dart';

class ProductService {
  final FirebaseFirestore _firestore;
  final LocalStorageService _storage;

  ProductService({
    required FirebaseFirestore firestore,
    required LocalStorageService storage,
  })  : _firestore = firestore,
        _storage = storage;

  CollectionReference get _productsCol => _firestore.collection('products');

  /// Fetches products prioritizing local cache to minimize Firestore quota burn
  Future<List<Product>> getProducts({bool forceRefresh = false}) async {
    final cached = _storage.getCachedProducts();
    if (!forceRefresh && cached.isNotEmpty) {
      return cached;
    }

    try {
      final snap = await _productsCol.get(const GetOptions(source: Source.serverAndCache));
      final products = snap.docs.map((doc) {
        return Product.fromMap(doc.data() as Map<String, dynamic>);
      }).toList();

      // Sort by sortOrder if available
      products.sort((a, b) {
        final aOrder = a.sortOrder ?? 1000;
        final bOrder = b.sortOrder ?? 1000;
        if (aOrder != bOrder) return aOrder.compareTo(bOrder);
        return a.name.compareTo(b.name);
      });

      if (products.isNotEmpty) {
        await _storage.saveProducts(products);
      }
      return products.isNotEmpty ? products : cached;
    } catch (e) {
      // Fallback to cache safely
      return cached;
    }
  }

  /// Adds or updates a single product
  Future<void> saveProduct(Product product) async {
    final docRef = _productsCol.doc(product.id);
    await docRef.set(
      {
        ...product.toMap(),
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );

    // Update in-memory local cache
    final current = _storage.getCachedProducts();
    final idx = current.indexWhere((p) => p.id == product.id);
    if (idx >= 0) {
      current[idx] = product;
    } else {
      current.insert(0, product);
    }
    await _storage.saveProducts(current);
  }

  /// Deletes a product
  Future<void> deleteProduct(String productId) async {
    await _productsCol.doc(productId).delete();
    final current = _storage.getCachedProducts();
    current.removeWhere((p) => p.id == productId);
    await _storage.saveProducts(current);
  }

  /// Batch reorders products updating sortOrder
  Future<void> reorderProducts(List<Product> reorderedList) async {
    final batch = _firestore.batch();
    for (int i = 0; i < reorderedList.length; i++) {
      final p = reorderedList[i];
      final docRef = _productsCol.doc(p.id);
      batch.update(docRef, {'sortOrder': i + 1});
    }
    await batch.commit();
    await _storage.saveProducts(reorderedList);
  }
}
