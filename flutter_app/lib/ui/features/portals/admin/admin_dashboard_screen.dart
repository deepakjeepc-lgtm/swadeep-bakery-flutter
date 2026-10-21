import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../data/models/order.dart';
import '../../../../data/models/product.dart';
import '../../../../data/services/order_service.dart';
import '../../../../logic/product_provider.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/widgets/animated_tap_builder.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final storage = ref.watch(localStorageServiceProvider);
    final orderService = OrderService(
      firestore: FirebaseFirestore.instance,
      storage: storage,
    );
    final productService = ref.watch(productServiceProvider);
    final productsAsync = ref.watch(rawProductsProvider);

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: const Text('Admin Operations', style: TextStyle(fontWeight: FontWeight.w800)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.textPrimaryLight,
        actions: [
          IconButton(
            icon: const Icon(Icons.home_outlined),
            tooltip: 'View Storefront',
            onPressed: () => context.go('/'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: () {
              storage.clearStaffSession();
              context.go('/');
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primaryDark,
          unselectedLabelColor: AppColors.textSecondaryLight,
          indicatorColor: AppColors.primaryDark,
          tabs: const [
            Tab(icon: Icon(Icons.receipt_long), text: 'Live Orders'),
            Tab(icon: Icon(Icons.inventory_2_outlined), text: 'Products'),
            Tab(icon: Icon(Icons.settings_outlined), text: 'Settings'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // 1. Live Orders Tab
          StreamBuilder<List<Order>>(
            stream: orderService.listenToRecentOrders(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final orders = snapshot.data ?? [];
              if (orders.isEmpty) {
                return const Center(child: Text('No orders yet'));
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: orders.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final o = orders[index];
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.borderLight),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Order #${o.orderId}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('₹${o.totalAmount.toInt()}',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryDark)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text('${o.customerName} • ${o.phone}', style: const TextStyle(fontSize: 13)),
                        Text(o.address, style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
                        const Divider(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            if (o.status == OrderStatus.pending) ...[
                              TextButton(
                                onPressed: () => orderService.updateOrderStatus(orderId: o.id, status: OrderStatus.rejected),
                                child: const Text('Reject', style: TextStyle(color: AppColors.error)),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: () => orderService.updateOrderStatus(orderId: o.id, status: OrderStatus.accepted),
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                                child: const Text('Accept Order', style: TextStyle(color: Colors.white)),
                              ),
                            ] else if (o.status == OrderStatus.accepted || o.status == OrderStatus.preparing) ...[
                              ElevatedButton(
                                onPressed: () => orderService.updateOrderStatus(orderId: o.id, status: OrderStatus.outForDelivery),
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryDark),
                                child: const Text('Assign Delivery', style: TextStyle(color: Colors.white)),
                              ),
                            ] else ...[
                              Text('Status: ${o.status.toDbValue().toUpperCase()}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),

          // 2. Products Tab
          productsAsync.when(
            data: (prods) {
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: prods.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final p = prods[index];
                  return ListTile(
                    tileColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    title: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('${p.category} • ₹${p.price.toInt()}'),
                    trailing: Switch(
                      value: p.available,
                      activeColor: AppColors.success,
                      onChanged: (val) async {
                        final updated = Product(
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          price: p.price,
                          category: p.category,
                          imageUrl: p.imageUrl,
                          available: val,
                        );
                        await productService.saveProduct(updated);
                        ref.invalidate(rawProductsProvider);
                      },
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Center(child: Text('Error: $e')),
          ),

          // 3. Settings Tab
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Restaurant Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    SizedBox(height: 12),
                    Text('Name: Swadeep Cake Shop & Restaurant'),
                    Text('Location: Main Road, Gidhaur, Bihar'),
                    Text('Contact: +91 8210344498'),
                    Text('FSSAI: 20426191000010'),
                    Text('UPI VPA: 8210344498@okbizaxis'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
