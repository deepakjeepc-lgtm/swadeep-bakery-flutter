import 'package:flutter/material.dart';

class MotionTokens {
  // Durations
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 350);
  static const Duration modal = Duration(milliseconds: 400);

  // Easing Curves
  static const Curve standard = Curves.easeInOutCubic;
  static const Curve entrance = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve bouncy = Curves.elasticOut;

  // Micro-interaction Scale Transforms
  static const double activeTapScale = 0.96;
  static const double hoverElevateScale = 1.02;
}
