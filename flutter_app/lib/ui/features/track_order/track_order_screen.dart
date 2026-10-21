import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../data/models/order.dart';
import '../../../data/services/order_service.dart';
import '../../../logic/product_provider.dart';
import '../../core/design_system/app_colors.dart';
import '../../core/widgets/animated_tap_builder.dart';

class TrackOrderScreen extends ConsumerWidget {
  final String orderId;
  final String? phone;

  const TrackOrderScreen({
    super.key,
    required this.orderId,
    this.phone,
  });

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
        title: const Text('Live Order Tracking', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.textPrimaryLight,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/'),
        ),
      ),
      body: StreamBuilder<Order?>(
        stream: orderService.trackOrder(orderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final order = snapshot.data;
          if (order == null) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 12),
                  Text('Order #$orderId Not Found',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.go('/'),
                    child: const Text('Back to Menu'),
                  ),
                ],
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Order Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order #${order.orderId}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 4),
                        Text('${order.items.length} items • ₹${order.totalAmount.toInt()}',
                            style: const TextStyle(color: AppColors.textSecondaryLight)),
                      ],
                    ),
                    _buildStatusBadge(order.status),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Tracking Timeline
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Order Progress',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 16),
                    _buildTimelineStep(
                      title: 'Order Placed',
                      subtitle: 'We have received your order',
                      isCompleted: true,
                      isCurrent: order.status == OrderStatus.pending,
                    ),
                    _buildTimelineStep(
                      title: 'Order Accepted & Preparing',
                      subtitle: 'Chef is baking your dishes fresh in the kitchen',
                      isCompleted: order.status != OrderStatus.pending && order.status != OrderStatus.rejected,
                      isCurrent: order.status == OrderStatus.accepted || order.status == OrderStatus.preparing,
                    ),
                    _buildTimelineStep(
                      title: 'Out for Delivery',
                      subtitle: order.assignedAgentName != null
                          ? 'Rider: ${order.assignedAgentName} (${order.assignedAgentVehicleNumber ?? 'Bike'})'
                          : 'Rider will pick up shortly',
                      isCompleted: order.status == OrderStatus.outForDelivery || order.status == OrderStatus.delivered,
                      isCurrent: order.status == OrderStatus.outForDelivery,
                    ),
                    _buildTimelineStep(
                      title: 'Delivered',
                      subtitle: 'Enjoy your fresh bakery treats!',
                      isCompleted: order.status == OrderStatus.delivered,
                      isCurrent: order.status == OrderStatus.delivered,
                      isLast: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Rider Card (if assigned)
              if (order.assignedAgentName != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      const CircleAvatar(
                        backgroundColor: AppColors.primaryLight,
                        child: Icon(Icons.delivery_dining, color: AppColors.primaryDark),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.assignedAgentName!,
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text(order.assignedAgentVehicle ?? 'Delivery Partner',
                                style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
                          ],
                        ),
                      ),
                      if (order.assignedAgentPhone != null)
                        IconButton(
                          icon: const Icon(Icons.phone, color: AppColors.primaryDark),
                          onPressed: () => launchUrl(Uri.parse('tel:${order.assignedAgentPhone}')),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 24),

              // Back to Home
              AnimatedTapBuilder(
                onTap: () => context.go('/'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.textPrimaryLight,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Center(
                    child: Text(
                      'Back to Menu',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(OrderStatus status) {
    Color bg = AppColors.primaryLight;
    Color fg = AppColors.primaryDark;
    String text = 'Pending';

    switch (status) {
      case OrderStatus.accepted:
        bg = AppColors.infoLight;
        fg = AppColors.info;
        text = 'Accepted';
        break;
      case OrderStatus.preparing:
        bg = AppColors.warningLight;
        fg = AppColors.warning;
        text = 'Preparing';
        break;
      case OrderStatus.outForDelivery:
        bg = AppColors.primaryLight;
        fg = AppColors.primaryDark;
        text = 'On the Way';
        break;
      case OrderStatus.delivered:
        bg = AppColors.successLight;
        fg = AppColors.success;
        text = 'Delivered';
        break;
      case OrderStatus.rejected:
        bg = AppColors.errorLight;
        fg = AppColors.error;
        text = 'Rejected';
        break;
      default:
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Text(text, style: TextStyle(color: fg, fontWeight: FontWeight.bold, fontSize: 12)),
    );
  }

  Widget _buildTimelineStep({
    required String title,
    required String subtitle,
    required bool isCompleted,
    required bool isCurrent,
    bool isLast = false,
  }) {
    Color dotColor = Colors.grey.shade300;
    if (isCompleted) dotColor = AppColors.success;
    if (isCurrent) dotColor = AppColors.primaryDark;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 16,
              height: 16,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(color: dotColor.withOpacity(0.4), blurRadius: 4),
                ],
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: isCompleted ? AppColors.success : Colors.grey.shade300,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: TextStyle(
                    fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                    fontSize: 14,
                    color: isCurrent ? AppColors.textPrimaryLight : AppColors.textSecondaryLight,
                  )),
              const SizedBox(height: 2),
              Text(subtitle,
                  style: const TextStyle(fontSize: 12, color: AppColors.textMutedLight)),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ],
    );
  }
}
