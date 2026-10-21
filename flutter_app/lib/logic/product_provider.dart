import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/product.dart';
import '../data/services/local_storage_service.dart';
import '../data/services/product_service.dart';

final localStorageServiceProvider = Provider<LocalStorageService>((ref) {
  throw UnimplementedError();
});

final productServiceProvider = Provider<ProductService>((ref) {
  final storage = ref.watch(localStorageServiceProvider);
  return ProductService(
    firestore: FirebaseFirestore.instance,
    storage: storage,
  );
});

final activeCategoryProvider = StateProvider<String>((ref) => 'All');
final searchQueryProvider = StateProvider<String>((ref) => '');

final rawProductsProvider = FutureProvider<List<Product>>((ref) async {
  final service = ref.watch(productServiceProvider);
  return service.getProducts();
});

final filteredProductsProvider = Provider<List<Product>>((ref) {
  final prodsAsync = ref.watch(rawProductsProvider);
  final activeCat = ref.watch(activeCategoryProvider);
  final query = ref.watch(searchQueryProvider).toLowerCase().trim();

  return prodsAsync.maybeWhen(
    data: (products) {
      return products.filterCategoryAndQuery(activeCat, query);
    },
    orElse: () => [],
  );
});

extension ProductFilterX on List<Product> {
  List<Product> filterCategoryAndQuery(String category, String query) {
    return where((p) {
      final matchesQuery = query.isEmpty ||
          p.name.toLowerCase().contains(query) ||
          p.description.toLowerCase().contains(query) ||
          p.category.toLowerCase().contains(query);

      final matchesCat = (category == 'All') ||
          (category == 'Featured' && (p.isFeatured || p.isPinnedToFront)) ||
          (p.category.toLowerCase() == category.toLowerCase());

      return matchesQuery && matchesCat;
    }).toList();
  }
}
