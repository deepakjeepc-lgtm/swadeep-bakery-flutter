import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/design_system/app_colors.dart';
import '../../core/widgets/animated_tap_builder.dart';
import '../../../logic/cart_provider.dart';
import '../../../logic/product_provider.dart';
import '../cart/cart_drawer_sheet.dart';
import '../product_detail/product_detail_sheet.dart';
import 'widgets/category_chip_list.dart';
import 'widgets/product_grid_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rawProdsAsync = ref.watch(rawProductsProvider);
    final filteredProducts = ref.watch(filteredProductsProvider);
    final activeCat = ref.watch(activeCategoryProvider);
    final cart = ref.watch(cartProvider);

    // Extract dynamic categories from raw products
    final categories = rawProdsAsync.maybeWhen(
      data: (prods) {
        final set = {'All', 'Featured', ...prods.map((p) => p.category)};
        return set.toList();
      },
      orElse: () => ['All', 'Cakes', 'Pizzas', 'Pastries'],
    );

    final screenWidth = MediaQuery.of(context).size.width;
    int crossAxisCount = 2;
    if (screenWidth > 900) {
      crossAxisCount = 4;
    } else if (screenWidth > 600) {
      crossAxisCount = 3;
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: SafeArea(
        child: Stack(
          children: [
            CustomScrollView(
              slivers: [
                // Clean Minimalist App Bar with Logo & Actions
                SliverAppBar(
                  floating: true,
                  snap: true,
                  backgroundColor: Colors.white,
                  elevation: 0,
                  title: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.cake, color: AppColors.primaryDark, size: 20),
                      ),
                      const SizedBox(width: 8),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Swadeep Bakery',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimaryLight,
                            ),
                          ),
                          Text(
                            'Gidhaur • Freshly Baked',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                          ),
                        ],
                      ),
                    ],
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.receipt_long_outlined, color: AppColors.textPrimaryLight),
                      tooltip: 'Track Order',
                      onPressed: () => context.push('/track_order/my_orders'),
                    ),
                    IconButton(
                      icon: const Icon(Icons.account_circle_outlined, color: AppColors.textPrimaryLight),
                      tooltip: 'Staff Portal',
                      onPressed: () => context.push('/staff_login'),
                    ),
                  ],
                ),

                // Search Bar Input
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppColors.borderLight),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.02),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: TextField(
                        onChanged: (val) => ref.read(searchQueryProvider.notifier).state = val,
                        decoration: const InputDecoration(
                          hintText: 'Search cakes, pizzas, snacks...',
                          hintStyle: TextStyle(fontSize: 13, color: AppColors.textMutedLight),
                          prefixIcon: Icon(Icons.search, size: 20, color: AppColors.textSecondaryLight),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ),
                ),

                // Category Chips List
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: CategoryChipList(
                      categories: categories,
                      activeCategory: activeCat,
                      onSelectCategory: (cat) {
                        ref.read(activeCategoryProvider.notifier).state = cat;
                      },
                    ),
                  ),
                ),

                // Products Grid or Loading State
                rawProdsAsync.when(
                  data: (_) {
                    if (filteredProducts.isEmpty) {
                      return const SliverFillRemaining(
                        hasScrollBody: false,
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.search_off, size: 48, color: Colors.grey),
                              SizedBox(height: 8),
                              Text('No products found', style: TextStyle(fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      );
                    }

                    return SliverPadding(
                      padding: EdgeInsets.fromLTRB(16, 8, 16, cart.items.isNotEmpty ? 90 : 20),
                      sliver: SliverGrid(
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: crossAxisCount,
                          childAspectRatio: 0.72,
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) {
                            final prod = filteredProducts[index];
                            return ProductGridCard(
                              product: prod,
                              onTap: () => ProductDetailSheet.show(context, prod),
                              onQuickAdd: () {
                                ref.read(cartProvider.notifier).addItem(product: prod);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Added ${prod.name} to cart!'),
                                    duration: const Duration(seconds: 1),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                              },
                            );
                          },
                          childCount: filteredProducts.length,
                        ),
                      ),
                    );
                  },
                  loading: () => const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (e, _) => SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text('Failed to load menu: $e')),
                  ),
                ),
              ],
            ),

            // Floating Bottom Cart Bar (Appears when cart has items)
            if (cart.items.isNotEmpty)
              Positioned(
                left: 16,
                right: 16,
                bottom: 16,
                child: AnimatedTapBuilder(
                  onTap: () => CartDrawerSheet.show(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.textPrimaryLight,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 16,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                '${cart.totalItemCount}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('Total Amount', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                Text(
                                  '₹${cart.totalAmount.toInt()}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const Row(
                          children: [
                            Text(
                              'View Cart',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_ios, color: Colors.white, size: 14),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
