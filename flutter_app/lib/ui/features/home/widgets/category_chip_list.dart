import 'package:flutter/material.dart';
import '../../../core/design_system/app_colors.dart';
import '../../../core/design_system/motion_tokens.dart';
import '../../../core/widgets/animated_tap_builder.dart';

class CategoryChipList extends StatelessWidget {
  final List<String> categories;
  final String activeCategory;
  final ValueChanged<String> onSelectCategory;

  const CategoryChipList({
    super.key,
    required this.categories,
    required this.activeCategory,
    required this.onSelectCategory,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final cat = categories[index];
          final isSelected = cat.toLowerCase() == activeCategory.toLowerCase();

          return AnimatedTapBuilder(
            onTap: () => onSelectCategory(cat),
            child: AnimatedContainer(
              duration: MotionTokens.normal,
              curve: MotionTokens.standard,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.textPrimaryLight : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(
                  color: isSelected ? AppColors.textPrimaryLight : AppColors.borderLight,
                  width: 1.2,
                ),
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: AppColors.textPrimaryLight.withOpacity(0.12),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        )
                      ]
                    : null,
              ),
              child: Center(
                child: Text(
                  cat,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
