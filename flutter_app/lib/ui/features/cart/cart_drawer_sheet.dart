import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../logic/cart_provider.dart';
import '../../core/design_system/app_colors.dart';
import '../../core/widgets/animated_tap_builder.dart';
import '../../core/widgets/network_image_box.dart';

class CartDrawerSheet extends ConsumerWidget {
  const CartDrawerSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CartDrawerSheet(),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      child: Column(
        children: [
          // Drag handle & Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_bag_outlined, color: AppColors.primaryDark),
                    const SizedBox(width: 8),
                    Text(
                      'Your Cart (${cart.totalItemCount})',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Items or Empty
          if (cart.items.isEmpty)
            Expanded(
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shopping_basket_outlined, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 12),
                    const Text(
                      'Your cart is empty',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Add delicious cakes and meals to start',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: cart.items.length,
                separatorBuilder: (_, __) => const Divider(height: 24),
                itemBuilder: (context, index) {
                  final item = cart.items[index];
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      NetworkImageBox(
                        imageUrl: item.selectedVariant?.imageUrl ?? item.product.imageUrl,
                        width: 56,
                        height: 56,
                        borderRadius: 10,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.product.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: AppColors.textPrimaryLight,
                              ),
                            ),
                            if (item.selectedVariant != null)
                              Text(
                                item.selectedVariant!.name,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondaryLight,
                                ),
                              ),
                            Text(
                              '₹${item.unitPrice.toInt()}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Quantity selector
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.backgroundLight,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove, size: 14),
                              onPressed: () => ref
                                  .read(cartProvider.notifier)
                                  .updateQuantity(item.id, item.quantity - 1),
                            ),
                            Text(
                              '${item.quantity}',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add, size: 14),
                              onPressed: () => ref
                                  .read(cartProvider.notifier)
                                  .updateQuantity(item.id, item.quantity + 1),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

          // Total & Checkout Button
          if (cart.items.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal', style: TextStyle(color: AppColors.textSecondaryLight)),
                      Text('₹${cart.subtotal.toInt()}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Delivery Fee', style: TextStyle(color: AppColors.textSecondaryLight)),
                      Text(
                        cart.deliveryFee == 0 ? 'FREE' : '₹${cart.deliveryFee.toInt()}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: cart.deliveryFee == 0 ? AppColors.vegGreen : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Payable',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '₹${cart.totalAmount.toInt()}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  AnimatedTapBuilder(
                    onTap: () {
                      Navigator.pop(context);
                      context.push('/checkout');
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.textPrimaryLight,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Center(
                        child: Text(
                          'Proceed to Checkout',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
