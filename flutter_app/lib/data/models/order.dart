import 'product.dart';

enum OrderStatus {
  pending,
  accepted,
  preparing,
  outForDelivery,
  delivered,
  rejected;

  String toDbValue() {
    switch (this) {
      case OrderStatus.pending:
        return 'pending';
      case OrderStatus.accepted:
        return 'accepted';
      case OrderStatus.preparing:
        return 'preparing';
      case OrderStatus.outForDelivery:
        return 'out_for_delivery';
      case OrderStatus.delivered:
        return 'delivered';
      case OrderStatus.rejected:
        return 'rejected';
    }
  }

  static OrderStatus fromDbValue(String? val) {
    switch (val) {
      case 'accepted':
        return OrderStatus.accepted;
      case 'preparing':
        return OrderStatus.preparing;
      case 'out_for_delivery':
        return OrderStatus.outForDelivery;
      case 'delivered':
        return OrderStatus.delivered;
      case 'rejected':
        return OrderStatus.rejected;
      case 'pending':
      default:
        return OrderStatus.pending;
    }
  }
}

class OrderItem {
  final String productId;
  final String name;
  final String? selectedSize;
  final List<ProductExtra> selectedExtras;
  final double price;
  final int quantity;
  final String? imageUrl;
  final String? category;
  final bool isNonFood;
  final int? prepTimeMinutes;

  OrderItem({
    required this.productId,
    required this.name,
    this.selectedSize,
    this.selectedExtras = const [],
    required this.price,
    required this.quantity,
    this.imageUrl,
    this.category,
    this.isNonFood = false,
    this.prepTimeMinutes,
  });

  factory OrderItem.fromMap(Map<String, dynamic> map) {
    final extrasList = (map['selectedExtras'] as List<dynamic>?)
            ?.map((e) => ProductExtra.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    return OrderItem(
      productId: map['productId']?.toString() ?? '',
      name: map['name']?.toString() ?? '',
      selectedSize: map['selectedSize']?.toString(),
      selectedExtras: extrasList,
      price: (map['price'] as num?)?.toDouble() ?? 0.0,
      quantity: (map['quantity'] as num?)?.toInt() ?? 1,
      imageUrl: map['imageUrl']?.toString(),
      category: map['category']?.toString(),
      isNonFood: map['isNonFood'] as bool? ?? false,
      prepTimeMinutes: (map['prepTimeMinutes'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'name': name,
      if (selectedSize != null) 'selectedSize': selectedSize,
      'selectedExtras': selectedExtras.map((e) => e.toMap()).toList(),
      'price': price,
      'quantity': quantity,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (category != null) 'category': category,
      'isNonFood': isNonFood,
      if (prepTimeMinutes != null) 'prepTimeMinutes': prepTimeMinutes,
    };
  }
}

class Order {
  final String id;
  final String orderId;
  final String customerName;
  final String phone;
  final String address;
  final String? notes;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final dynamic createdAt;
  final dynamic updatedAt;
  final String? assignedAgentId;
  final String? assignedAgentName;
  final String? assignedAgentPhone;
  final String? assignedAgentVehicle;
  final String? assignedAgentVehicleNumber;
  final String? kitchenStatus;
  final String? preparingStatus;
  final String? paymentMethod;
  final String? paymentStatus;
  final double? deliveryFee;
  final double? distanceKm;
  final double? subtotal;
  final String? customerEmail;

  Order({
    required this.id,
    required this.orderId,
    required this.customerName,
    required this.phone,
    required this.address,
    this.notes,
    required this.items,
    required this.totalAmount,
    required this.status,
    this.createdAt,
    this.updatedAt,
    this.assignedAgentId,
    this.assignedAgentName,
    this.assignedAgentPhone,
    this.assignedAgentVehicle,
    this.assignedAgentVehicleNumber,
    this.kitchenStatus,
    this.preparingStatus,
    this.paymentMethod = 'cod',
    this.paymentStatus = 'unpaid',
    this.deliveryFee,
    this.distanceKm,
    this.subtotal,
    this.customerEmail,
  });

  factory Order.fromMap(Map<String, dynamic> map, String docId) {
    final itemsList = (map['items'] as List<dynamic>?)
            ?.map((e) => OrderItem.fromMap(e as Map<String, dynamic>))
            .toList() ??
        [];

    return Order(
      id: docId,
      orderId: map['orderId']?.toString() ?? docId,
      customerName: map['customerName']?.toString() ?? '',
      phone: map['phone']?.toString() ?? '',
      address: map['address']?.toString() ?? '',
      notes: map['notes']?.toString(),
      items: itemsList,
      totalAmount: (map['totalAmount'] as num?)?.toDouble() ?? 0.0,
      status: OrderStatus.fromDbValue(map['status']?.toString()),
      createdAt: map['createdAt'],
      updatedAt: map['updatedAt'],
      assignedAgentId: map['assignedAgentId']?.toString(),
      assignedAgentName: map['assignedAgentName']?.toString(),
      assignedAgentPhone: map['assignedAgentPhone']?.toString(),
      assignedAgentVehicle: map['assignedAgentVehicle']?.toString(),
      assignedAgentVehicleNumber: map['assignedAgentVehicleNumber']?.toString(),
      kitchenStatus: map['kitchenStatus']?.toString(),
      preparingStatus: map['preparingStatus']?.toString(),
      paymentMethod: map['paymentMethod']?.toString() ?? 'cod',
      paymentStatus: map['paymentStatus']?.toString() ?? 'unpaid',
      deliveryFee: (map['deliveryFee'] as num?)?.toDouble(),
      distanceKm: (map['distanceKm'] as num?)?.toDouble(),
      subtotal: (map['subtotal'] as num?)?.toDouble(),
      customerEmail: map['customerEmail']?.toString(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'orderId': orderId,
      'customerName': customerName,
      'phone': phone,
      'address': address,
      if (notes != null) 'notes': notes,
      'items': items.map((i) => i.toMap()).toList(),
      'totalAmount': totalAmount,
      'status': status.toDbValue(),
      'createdAt': createdAt,
      if (updatedAt != null) 'updatedAt': updatedAt,
      if (assignedAgentId != null) 'assignedAgentId': assignedAgentId,
      if (assignedAgentName != null) 'assignedAgentName': assignedAgentName,
      if (assignedAgentPhone != null) 'assignedAgentPhone': assignedAgentPhone,
      if (assignedAgentVehicle != null) 'assignedAgentVehicle': assignedAgentVehicle,
      if (assignedAgentVehicleNumber != null)
        'assignedAgentVehicleNumber': assignedAgentVehicleNumber,
      if (kitchenStatus != null) 'kitchenStatus': kitchenStatus,
      if (preparingStatus != null) 'preparingStatus': preparingStatus,
      'paymentMethod': paymentMethod ?? 'cod',
      'paymentStatus': paymentStatus ?? 'unpaid',
      if (deliveryFee != null) 'deliveryFee': deliveryFee,
      if (distanceKm != null) 'distanceKm': distanceKm,
      if (subtotal != null) 'subtotal': subtotal,
      if (customerEmail != null) 'customerEmail': customerEmail,
    };
  }
}
