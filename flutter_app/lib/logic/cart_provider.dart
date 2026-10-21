import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/cart_item.dart';
import '../data/models/product.dart';

class CartState {
  final List<CartItem> items;
  final double deliveryFee;
  final double? distanceKm;
  final String? discountCode;
  final double discountAmount;

  CartState({
    this.items = const [],
    this.deliveryFee = 0.0,
    this.distanceKm,
    this.discountCode,
    this.discountAmount = 0.0,
  });

  double get subtotal => items.fold(0.0, (sum, i) => sum + i.totalPrice);
  double get totalAmount => (subtotal + deliveryFee - discountAmount).clamp(0.0, double.infinity);
  int get totalItemCount => items.fold(0, (sum, i) => sum + i.quantity);

  CartState copyWith({
    List<CartItem>? items,
    double? deliveryFee,
    double? distanceKm,
    String? discountCode,
    double? discountAmount,
  }) {
    return CartState(
      items: items ?? this.items,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      distanceKm: distanceKm ?? this.distanceKm,
      discountCode: discountCode ?? this.discountCode,
      discountAmount: discountAmount ?? this.discountAmount,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(CartState());

  void addItem({
    required Product product,
    ProductVariant? variant,
    List<ProductExtra> extras = const [],
    int quantity = 1,
  }) {
    // Unique identifier based on product id, variant name, and extras
    final extraIds = extras.map((e) => e.id).toList()..sort();
    final cartItemId = '${product.id}_${variant?.name ?? 'std'}_${extraIds.join(',')}';

    final existingIndex = state.items.indexWhere((i) => i.id == cartItemId);

    if (existingIndex >= 0) {
      final updatedList = [...state.items];
      updatedList[existingIndex].quantity += quantity;
      state = state.copyWith(items: updatedList);
    } else {
      final newItem = CartItem(
        id: cartItemId,
        product: product,
        selectedVariant: variant,
        selectedExtras: extras,
        quantity: quantity,
      );
      state = state.copyWith(items: [...state.items, newItem]);
    }
  }

  void updateQuantity(String cartItemId, int newQty) {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    final updatedList = state.items.map((i) {
      if (i.id == cartItemId) {
        return i.copyWith(quantity: newQty);
      }
      return i;
    }).toList();
    state = state.copyWith(items: updatedList);
  }

  void removeItem(String cartItemId) {
    state = state.copyWith(
      items: state.items.where((i) => i.id != cartItemId).toList(),
    );
  }

  void updateDeliveryDistance(double? km) {
    // Exact web distance calculation logic:
    // <= 5 km: Free Delivery (0)
    // > 5 km: Flat ₹20
    double fee = 0.0;
    if (km != null && km > 5.0) {
      fee = 20.0;
    }
    state = state.copyWith(distanceKm: km, deliveryFee: fee);
  }

  void clearCart() {
    state = CartState();
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});
