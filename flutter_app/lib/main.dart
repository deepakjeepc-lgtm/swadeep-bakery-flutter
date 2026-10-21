import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'config/firebase_config.dart';
import 'data/services/local_storage_service.dart';
import 'logic/product_provider.dart';
import 'ui/core/design_system/app_colors.dart';
import 'ui/navigation/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize Local Cache Storage
  final localStorage = await LocalStorageService.init();

  // 2. Safely initialize Firebase targeting project ai-studio-swadeep-c9f5f4f9-12f6-4ef3-a3b0-884128973d8b
  try {
    await Firebase.initializeApp(
      options: AppFirebaseConfig.currentPlatform,
    );
  } catch (e) {
    debugPrint('Firebase init notice: $e');
  }

  runApp(
    ProviderScope(
      overrides: [
        localStorageServiceProvider.overrideWithValue(localStorage),
      ],
      child: const SwadeepBakeryApp(),
    ),
  );
}

class SwadeepBakeryApp extends StatelessWidget {
  const SwadeepBakeryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Swadeep Cake Shop & Restaurant',
      debugShowCheckedModeBanner: false,
      routerConfig: appRouter,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          surface: AppColors.surfaceLight,
          background: AppColors.backgroundLight,
        ),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(
          Theme.of(context).textTheme,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: AppColors.textPrimaryLight,
          elevation: 0,
        ),
      ),
    );
  }
}
