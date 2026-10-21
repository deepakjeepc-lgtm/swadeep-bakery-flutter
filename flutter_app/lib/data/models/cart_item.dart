import 'product.dart';

class CartItem {
  final String id;
  final Product product;
  final ProductVariant? selectedVariant;
  final List<ProductExtra> selectedExtras;
  int quantity;

  CartItem({
    required this.id,
    required this.product,
    this.selectedVariant,
    this.selectedExtras = const [],
    this.quantity = 1,
  });

  double get unitPrice {
    double base = selectedVariant?.price ?? product.price;
    double extras = selectedExtras.fold(0.0, (sum, e) => sum + e.price);
    return base + extras;
  }

  double get totalPrice => unitPrice * quantity;

  CartItem copyWith({
    String? id,
    Product? product,
    ProductVariant? selectedVariant,
    List<ProductExtra>? selectedExtras,
    int? quantity,
  }) {
    return CartItem(
      id: id ?? this.id,
      product: product ?? this.product,
      selectedVariant: selectedVariant ?? this.selectedVariant,
      selectedExtras: selectedExtras ?? this.selectedExtras,
      quantity: quantity ?? this.quantity,
    );
  }
}
