import 'package:flutter/material.dart';
import '../../../../data/models/product.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/design_system/motion_tokens.dart';
import '../../../core/widgets/animated_tap_builder.dart';
import '../../../core/widgets/network_image_box.dart';

class ProductGridCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;
  final VoidCallback onQuickAdd;

  const ProductGridCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onQuickAdd,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedTapBuilder(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderLight, width: 1.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Stack with Veg Tag & Badges
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1.15,
                  child: NetworkImageBox(
                    imageUrl: product.imageUrl,
                    borderRadius: 0,
                    fit: BoxFit.cover,
                  ),
                ),
                // Dietary Badge (Veg / Non-veg)
                if (!product.isNonFood)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(6),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: product.isVegetarian
                                ? AppColors.vegGreen
                                : AppColors.nonVegRed,
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Center(
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: product.isVegetarian
                                  ? AppColors.vegGreen
                                  : AppColors.nonVegRed,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                // Featured Pin
                if (product.isFeatured)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppColors.primaryDark,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '★ Best',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimaryLight,
                            height: 1.25,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          product.category,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),

                    // Price & Add Button Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          '₹${product.price.toInt()}',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                        AnimatedTapBuilder(
                          onTap: onQuickAdd,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.add, size: 14, color: Colors.white),
                                SizedBox(width: 2),
                                Text(
                                  'ADD',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
