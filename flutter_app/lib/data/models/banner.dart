class PromotionalBanner {
  final String id;
  final String badge;
  final String title;
  final String description;
  final String? couponCode;
  final String? discountText;
  final String? targetCategory;
  final String? targetProductId;
  final String? buttonText;
  final String? imageUrl;
  final bool isActive;
  final int order;

  PromotionalBanner({
    required this.id,
    required this.badge,
    required this.title,
    required this.description,
    this.couponCode,
    this.discountText,
    this.targetCategory,
    this.targetProductId,
    this.buttonText = 'Order Now',
    this.imageUrl,
    this.isActive = true,
    this.order = 1,
  });

  factory PromotionalBanner.fromMap(Map<String, dynamic> map, String id) {
    return PromotionalBanner(
      id: id,
      badge: map['badge']?.toString() ?? 'Special Offer',
      title: map['title']?.toString() ?? '',
      description: map['description']?.toString() ?? '',
      couponCode: map['couponCode']?.toString(),
      discountText: map['discountText']?.toString(),
      targetCategory: map['targetCategory']?.toString(),
      targetProductId: map['targetProductId']?.toString(),
      buttonText: map['buttonText']?.toString() ?? 'Order Now',
      imageUrl: map['imageUrl']?.toString(),
      isActive: map['isActive'] as bool? ?? true,
      order: (map['order'] as num?)?.toInt() ?? 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'badge': badge,
      'title': title,
      'description': description,
      if (couponCode != null) 'couponCode': couponCode,
      if (discountText != null) 'discountText': discountText,
      if (targetCategory != null) 'targetCategory': targetCategory,
      if (targetProductId != null) 'targetProductId': targetProductId,
      'buttonText': buttonText,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'isActive': isActive,
      'order': order,
    };
  }
}
