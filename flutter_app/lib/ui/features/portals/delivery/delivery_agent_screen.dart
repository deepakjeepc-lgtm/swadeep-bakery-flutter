import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../data/models/order.dart';
import '../../../../data/services/order_service.dart';
import '../../../../logic/product_provider.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/widgets/animated_tap_builder.dart';

class DeliveryAgentScreen extends ConsumerWidget {
  const DeliveryAgentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storage = ref.watch(localStorageServiceProvider);
    final orderService = OrderService(
      firestore: FirebaseFirestore.instance,
      storage: storage,
    );

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('🛵 Delivery Rider Portal', style: TextStyle(fontWeight: FontWeight.bold)),
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
          final deliveryOrders = allOrders
              .where((o) =>
                  o.status == OrderStatus.outForDelivery ||
                  o.status == OrderStatus.preparing ||
                  o.status == OrderStatus.accepted)
              .toList();

          if (deliveryOrders.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.two_wheeler, size: 64, color: AppColors.primaryDark),
                  const SizedBox(height: 12),
                  const Text('No Active Deliveries', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('New delivery tickets will appear here', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: deliveryOrders.length,
            separatorBuilder: (_, __) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final order = deliveryOrders[index];

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
                        Text('Order #${order.orderId}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: order.paymentMethod == 'cod' ? AppColors.warningLight : AppColors.successLight,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            order.paymentMethod == 'cod' ? 'COLLECT COD: ₹${order.totalAmount.toInt()}' : 'PAID ONLINE',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              color: order.paymentMethod == 'cod' ? AppColors.warning : AppColors.success,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const Icon(Icons.person, size: 16, color: AppColors.textSecondaryLight),
                        const SizedBox(width: 6),
                        Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: AppColors.textSecondaryLight),
                        const SizedBox(width: 6),
                        Expanded(child: Text(order.address, style: const TextStyle(fontSize: 13))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.phone, size: 16),
                            label: const Text('Call'),
                            onPressed: () => launchUrl(Uri.parse('tel:${order.phone}')),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.map, size: 16),
                            label: const Text('Directions'),
                            onPressed: () {
                              final query = Uri.encodeComponent(order.address);
                              launchUrl(Uri.parse('https://www.google.com/maps/search/?api=1&query=$query'));
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Delivery Action
                    if (order.status != OrderStatus.delivered)
                      AnimatedTapBuilder(
                        onTap: () async {
                          await orderService.updateOrderStatus(
                            orderId: order.id,
                            status: OrderStatus.delivered,
                            additionalFields: {
                              'deliveredAt': FieldValue.serverTimestamp(),
                              'paymentStatus': 'paid',
                            },
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Order #${order.orderId} Delivered!')),
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
                              'Slide / Tap to Confirm Delivery ✓',
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
