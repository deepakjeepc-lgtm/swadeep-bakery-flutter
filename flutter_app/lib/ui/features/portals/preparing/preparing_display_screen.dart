import 'package:cloud_firestore/cloud_firestore.dart' hide Order;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../data/models/order.dart';
import '../../../../data/services/order_service.dart';
import '../../../../logic/product_provider.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/widgets/animated_tap_builder.dart';

class PreparingDisplayScreen extends ConsumerStatefulWidget {
  const PreparingDisplayScreen({super.key});

  @override
  ConsumerState<PreparingDisplayScreen> createState() => _PreparingDisplayScreenState();
}

class _PreparingDisplayScreenState extends ConsumerState<PreparingDisplayScreen> {
  final Set<String> _packedItems = {};

  @override
  Widget build(BuildContext context) {
    final storage = ref.watch(localStorageServiceProvider);
    final orderService = OrderService(
      firestore: FirebaseFirestore.instance,
      storage: storage,
    );

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('🎁 Packing & Props Station', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.textPrimaryLight,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              storage.clearStaffSession();
              context.go('/');
            },
          ),
        ],
      ),
      body: StreamBuilder<List<Order>>(
        stream: orderService.listenToRecentOrders(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final allOrders = snapshot.data ?? [];
          final activePackingOrders = allOrders
              .where((o) =>
                  o.status == OrderStatus.accepted ||
                  o.status == OrderStatus.preparing)
              .toList();

          if (activePackingOrders.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.all_inbox, size: 64, color: AppColors.primary),
                  const SizedBox(height: 12),
                  const Text('All orders packed!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('No packing tickets in queue', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: activePackingOrders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final order = activePackingOrders[index];

              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
                  ],
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Order #${order.orderId} • ${order.customerName}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('${order.items.length} items', style: const TextStyle(color: AppColors.textSecondaryLight)),
                      ],
                    ),
                    const Divider(height: 16),
                    ...order.items.map((item) {
                      final itemKey = '${order.id}_${item.productId}';
                      final isPacked = _packedItems.contains(itemKey);

                      return CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: isPacked,
                        activeColor: AppColors.primaryDark,
                        title: Text(
                          '${item.quantity}x ${item.name}',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            decoration: isPacked ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        subtitle: item.isNonFood ? const Text('★ Gift / Decor Item', style: TextStyle(color: Colors.purple, fontSize: 12)) : null,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              _packedItems.add(itemKey);
                            } else {
                              _packedItems.remove(itemKey);
                            }
                          });
                        },
                      );
                    }),
                    const SizedBox(height: 12),
                    AnimatedTapBuilder(
                      onTap: () async {
                        await orderService.updateOrderStatus(
                          orderId: order.id,
                          status: OrderStatus.preparing,
                          additionalFields: {'preparingStatus': 'ready'},
                        );
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Order #${order.orderId} Packed!')),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.textPrimaryLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Text(
                            'Mark Packed & Ready for Pickup',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
