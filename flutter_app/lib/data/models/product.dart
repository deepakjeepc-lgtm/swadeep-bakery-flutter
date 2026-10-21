class ProductVariant {
  final String name;
  final double price;
  final String? colorName;
  final String? colorCode;
  final String? imageUrl;
  final String? imageFit;
  final bool available;

  ProductVariant({
    required this.name,
    required this.price,
    this.colorName,
    this.colorCode,
    this.imageUrl,
    this.imageFit,
    this.available = true,
  });

  factory ProductVariant.fromMap(Map<String, dynamic> map) {
    return ProductVariant(
      name: map['name']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      colorName: map['colorName']?.toString(),
      colorCode: map['colorCode']?.toString(),
      imageUrl: map['imageUrl']?.toString(),
      imageFit: map['imageFit']?.toString(),
      available: map['available'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'price': price,
      if (colorName != null) 'colorName': colorName,
      if (colorCode != null) 'colorCode': colorCode,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (imageFit != null) 'imageFit': imageFit,
      'available': available,
    };
  }
}

class ProductColorVariant {
  final String? id;
  final String name;
  final String? colorCode;
  final String? imageUrl;
  final double price;
  final String? imageFit;

  ProductColorVariant({
    this.id,
    required this.name,
    this.colorCode,
    this.imageUrl,
    required this.price,
    this.imageFit,
  });

  factory ProductColorVariant.fromMap(Map<String, dynamic> map) {
    return ProductColorVariant(
      id: map['id']?.toString(),
      name: map['name']?.toString() ?? '',
      colorCode: map['colorCode']?.toString(),
      imageUrl: map['imageUrl']?.toString(),
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      imageFit: map['imageFit']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      'name': name,
      if (colorCode != null) 'colorCode': colorCode,
      if (imageUrl != null) 'imageUrl': imageUrl,
      'price': price,
      if (imageFit != null) 'imageFit': imageFit,
    };
  }
}

class ProductExtra {
  final String id;
  final String name;
  final double price;
  final bool available;
  final String? category;

  ProductExtra({
    required this.id,
    required this.name,
    required this.price,
    this.available = true,
    this.category,
  });

  factory ProductExtra.fromMap(Map<String, dynamic> map) {
    return ProductExtra(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      available: map['available'] as bool? ?? true,
      category: map['category']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'available': available,
      if (category != null) 'category': category,
    };
  }
}

class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String category;
  final String imageUrl;
  final List<String> images;
  final bool available;
  final int? stockQuantity;
  final int? lowStockThreshold;
  final bool trackStock;
  final bool isVegetarian;
  final bool isNonFood;
  final int? prepTimeMinutes;
  final String? imageFit;
  final List<ProductVariant> variants;
  final List<ProductColorVariant> colorVariants;
  final List<ProductExtra> availableExtras;
  final int? sortOrder;
  final bool isFeatured;
  final bool isPinnedToFront;
  final String? realProductId;
  final int? defaultVariantIndex;
  final String? selectedColorName;

  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.category,
    required this.imageUrl,
    this.images = const [],
    this.available = true,
    this.stockQuantity,
    this.lowStockThreshold,
    this.trackStock = false,
    this.isVegetarian = true,
    this.isNonFood = false,
    this.prepTimeMinutes,
    this.imageFit,
    this.variants = const [],
    this.colorVariants = const [],
    this.availableExtras = const [],
    this.sortOrder,
    this.isFeatured = false,
    this.isPinnedToFront = false,
    this.realProductId,
    this.defaultVariantIndex,
    this.selectedColorName,
  });

  factory Product.fromMap(Map<String, dynamic> map) {
    final imagesList = (map['images'] as List<dynamic>?)
            ?.map((e) => e.toString())
            .toList() ??
        [];

    final variantsList = (map['variants'] as List<dynamic>?)
            ?.map((e) => ProductVariant.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    final colorVariantsList = (map['colorVariants'] as List<dynamic>?)
            ?.map((e) => ProductColorVariant.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    final extrasList = (map['availableExtras'] as List<dynamic>?)
            ?.map((e) => ProductExtra.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    return Product(
      id: map['id']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      description: map['description']?.toString() ?? '',
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      category: map['category']?.toString() ?? 'General',
      imageUrl: map['imageUrl']?.toString() ?? '',
      images: imagesList,
      available: map['available'] as bool? ?? true,
      stockQuantity: map['stockQuantity'] as int?,
      lowStockThreshold: map['lowStockThreshold'] as int?,
      trackStock: map['trackStock'] as bool? ?? false,
      isVegetarian: map['isVegetarian'] as bool? ?? true,
      isNonFood: map['isNonFood'] as bool? ?? false,
      prepTimeMinutes: map['prepTimeMinutes'] as int?,
      imageFit: map['imageFit']?.toString(),
      variants: variantsList,
      colorVariants: colorVariantsList,
      availableExtras: extrasList,
      sortOrder: map['sortOrder'] as int?,
      isFeatured: map['isFeatured'] as bool? ?? false,
      isPinnedToFront: map['isPinnedToFront'] as bool? ?? false,
      realProductId: map['realProductId']?.toString(),
      defaultVariantIndex: map['defaultVariantIndex'] as int?,
      selectedColorName: map['selectedColorName']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'category': category,
      'imageUrl': imageUrl,
      'images': images,
      'available': available,
      if (stockQuantity != null) 'stockQuantity': stockQuantity,
      if (lowStockThreshold != null) 'lowStockThreshold': lowStockThreshold,
      'trackStock': trackStock,
      'isVegetarian': isVegetarian,
      'isNonFood': isNonFood,
      if (prepTimeMinutes != null) 'prepTimeMinutes': prepTimeMinutes,
      if (imageFit != null) 'imageFit': imageFit,
      'variants': variants.map((v) => v.toMap()).toList(),
      'colorVariants': colorVariants.map((c) => c.toMap()).toList(),
      'availableExtras': availableExtras.map((e) => e.toMap()).toList(),
      if (sortOrder != null) 'sortOrder': sortOrder,
      'isFeatured': isFeatured,
      'isPinnedToFront': isPinnedToFront,
      if (realProductId != null) 'realProductId': realProductId,
      if (defaultVariantIndex != null) 'defaultVariantIndex': defaultVariantIndex,
      if (selectedColorName != null) 'selectedColorName': selectedColorName,
    };
  }
}
