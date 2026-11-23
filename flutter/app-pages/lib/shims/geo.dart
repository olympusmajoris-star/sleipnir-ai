// Studio preview stand-in for package:geolocator.
// The test Valkyrie always stands at the same spot in Palm Coast, so the
// preview never asks the browser for location.

class Position {
  const Position({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;
}

enum LocationPermission {
  denied,
  deniedForever,
  whileInUse,
  always,
  unableToDetermine,
}

class Geolocator {
  Geolocator._();

  static double latitude = 29.5468;
  static double longitude = -81.2240;

  static Future<bool> isLocationServiceEnabled() async => true;

  static Future<LocationPermission> checkPermission() async =>
      LocationPermission.whileInUse;

  static Future<LocationPermission> requestPermission() async =>
      LocationPermission.whileInUse;

  static Future<Position> getCurrentPosition({
    Object? locationSettings,
    Object? desiredAccuracy,
    Object? forceAndroidLocationManager,
    Object? timeLimit,
  }) async =>
      Position(latitude: latitude, longitude: longitude);
}
