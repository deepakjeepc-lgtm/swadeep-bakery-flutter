import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../data/models/order.dart';
import '../../../../data/services/order_service.dart';
import '../../../../logic/product_provider.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/widgets/animated_tap_builder.dart';

class KitchenDisplayScreen extends ConsumerStatefulWidget {
  const KitchenDisplayScreen({super.key});

  @override
  ConsumerState<KitchenDisplayScreen> createState() => _KitchenDisplayScreenState();
}

class _KitchenDisplayScreenState extends ConsumerState<KitchenDisplayScreen> {
  final Set<String> _tickedItems = {};

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
        title: const Text('👨‍🍳 Kitchen Display System (KDS)', style: TextStyle(fontWeight: FontWeight.bold)),
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
          // Filter active kitchen orders (pending, accepted, preparing)
          final kitchenOrders = allOrders
              .where((o) =>
                  o.status == OrderStatus.pending ||
                  o.status == OrderStatus.accepted ||
                  o.status == OrderStatus.preparing)
              .toList();

          if (kitchenOrders.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle_outline, size: 64, color: AppColors.success),
                  const SizedBox(height: 12),
                  const Text('All orders prepared!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('No pending food tickets in queue', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: MediaQuery.of(context).size.width > 900 ? 3 : (MediaQuery.of(context).size.width > 600 ? 2 : 1),
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 0.85,
            ),
            itemCount: kitchenOrders.length,
            itemBuilder: (context, index) {
              final order = kitchenOrders[index];
              // Filter out non-food items for the chef
              final foodItems = order.items.where((i) => !i.isNonFood).toList();

              return Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: order.status == OrderStatus.pending ? AppColors.error : AppColors.borderLight,
                    width: order.status == OrderStatus.pending ? 2 : 1,
                  ),
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
                        Text('Ticket #${order.orderId}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: order.status == OrderStatus.pending ? AppColors.errorLight : AppColors.warningLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            order.status.toDbValue().toUpperCase(),
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              color: order.status == OrderStatus.pending ? AppColors.error : AppColors.warning,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 16),
                    Expanded(
                      child: ListView(
                        children: foodItems.map((item) {
                          final itemKey = '${order.id}_${item.productId}';
                          final isTicked = _tickedItems.contains(itemKey);

                          return CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: isTicked,
                            activeColor: AppColors.success,
                            title: Text(
                              '${item.quantity}x ${item.name}',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                decoration: isTicked ? TextDecoration.lineThrough : null,
                                color: isTicked ? Colors.grey : AppColors.textPrimaryLight,
                              ),
                            ),
                            subtitle: item.selectedSize != null ? Text(item.selectedSize!) : null,
                            onChanged: (val) {
                              setState(() {
                                if (val == true) {
                                  _tickedItems.add(itemKey);
                                } else {
                                  _tickedItems.remove(itemKey);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Action button
                    AnimatedTapBuilder(
                      onTap: () async {
                        await orderService.updateOrderStatus(
                          orderId: order.id,
                          status: OrderStatus.preparing,
                          additionalFields: {'kitchenStatus': 'ready'},
                        );
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Order #${order.orderId} marked Ready!')),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Center(
                          child: Text(
                            'Mark Ready & Dispatch',
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
