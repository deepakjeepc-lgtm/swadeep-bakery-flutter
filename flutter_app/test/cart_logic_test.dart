import 'package:flutter_test/flutter_test.dart';
import 'package:swadeep_bakery/data/models/product.dart';
import 'package:swadeep_bakery/logic/cart_provider.dart';

void main() {
  group('Cart & Delivery Logic Tests', () {
    test('calculate distance-based delivery fee matching web app rules', () {
      final notifier = CartNotifier();

      // <= 5 km is free
      notifier.updateDeliveryDistance(3.5);
      expect(notifier.state.deliveryFee, 0.0);

      // exactly 5 km is free
      notifier.updateDeliveryDistance(5.0);
      expect(notifier.state.deliveryFee, 0.0);

      // > 5 km is flat Rs 20
      notifier.updateDeliveryDistance(6.5);
      expect(notifier.state.deliveryFee, 20.0);
    });

    test('cart item quantity, unit price, and subtotal calculation', () {
      final notifier = CartNotifier();

      final pizza = Product(
        id: 'pizza-1',
        name: 'Cheese Paneer Pizza',
        description: 'Fresh paneer pizza',
        price: 199.0,
        category: 'Pizzas',
        imageUrl: 'https://example.com/pizza.jpg',
      );

      final extraCheese = ProductExtra(
        id: 'extra-1',
        name: 'Extra Cheese',
        price: 30.0,
      );

      notifier.addItem(
        product: pizza,
        extras: [extraCheese],
        quantity: 2,
      );

      // 199 + 30 = 229 per item * 2 = 458
      expect(notifier.state.items.length, 1);
      expect(notifier.state.items.first.unitPrice, 229.0);
      expect(notifier.state.subtotal, 458.0);
    });
  });
}
