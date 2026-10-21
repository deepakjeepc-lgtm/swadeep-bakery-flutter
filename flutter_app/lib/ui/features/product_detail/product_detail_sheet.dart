import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/product.dart';
import '../../../logic/cart_provider.dart';
import '../../core/design_system/app_colors.dart';
import '../../core/widgets/animated_tap_builder.dart';
import '../../core/widgets/network_image_box.dart';

class ProductDetailSheet extends ConsumerStatefulWidget {
  final Product product;

  const ProductDetailSheet({super.key, required this.product});

  static Future<void> show(BuildContext context, Product product) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => ProductDetailSheet(product: product),
    );
  }

  @override
  ConsumerState<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends ConsumerState<ProductDetailSheet> {
  ProductVariant? _selectedVariant;
  final Set<ProductExtra> _selectedExtras = {};
  int _quantity = 1;

  @override
  void initState() {
    super.initState();
    if (widget.product.variants.isNotEmpty) {
      _selectedVariant = widget.product.variants.first;
    }
  }

  double get _currentUnitPrice {
    double base = _selectedVariant?.price ?? widget.product.price;
    double extras = _selectedExtras.fold(0.0, (sum, e) => sum + e.price);
    return base + extras;
  }

  double get _totalPrice => _currentUnitPrice * _quantity;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Scrollable body
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Product Photo
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: AspectRatio(
                      aspectRatio: 1.4,
                      child: NetworkImageBox(
                        imageUrl: _selectedVariant?.imageUrl ?? widget.product.imageUrl,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Title and Base Price
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          widget.product.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      Text(
                        '₹${_currentUnitPrice.toInt()}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.product.description,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.textSecondaryLight,
                      height: 1.4,
                    ),
                  ),

                  // Variants Section (Sizes / Weights)
                  if (widget.product.variants.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Select Size / Option',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: widget.product.variants.map((v) {
                        final isChosen = _selectedVariant?.name == v.name;
                        return ChoiceChip(
                          label: Text('${v.name} (₹${v.price.toInt()})'),
                          selected: isChosen,
                          onSelected: (_) => setState(() => _selectedVariant = v),
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: isChosen ? Colors.white : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  // Available Extras (Toppings / Add-ons)
                  if (widget.product.availableExtras.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    const Text(
                      'Add Extras & Toppings',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimaryLight,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...widget.product.availableExtras.map((extra) {
                      final isSelected = _selectedExtras.contains(extra);
                      return CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: isSelected,
                        title: Text(extra.name, style: const TextStyle(fontSize: 14)),
                        subtitle: Text('+₹${extra.price.toInt()}'),
                        activeColor: AppColors.primaryDark,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              _selectedExtras.add(extra);
                            } else {
                              _selectedExtras.remove(extra);
                            }
                          });
                        },
                      );
                    }),
                  ],
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),

          // Bottom Bar with Quantity Selector and Add to Cart Button
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppColors.borderLight)),
            ),
            child: Row(
              children: [
                // Quantity Counter
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.backgroundLight,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove, size: 18),
                        onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                      ),
                      Text(
                        '$_quantity',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 18),
                        onPressed: () => setState(() => _quantity++),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),

                // Add to Cart Button
                Expanded(
                  child: AnimatedTapBuilder(
                    onTap: () {
                      ref.read(cartProvider.notifier).addItem(
                            product: widget.product,
                            variant: _selectedVariant,
                            extras: _selectedExtras.toList(),
                            quantity: _quantity,
                          );
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Added ${widget.product.name} to cart!'),
                          duration: const Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.textPrimaryLight,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          'Add to Cart • ₹${_totalPrice.toInt()}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
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
