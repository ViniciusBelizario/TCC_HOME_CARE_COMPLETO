import 'dart:convert';
import '../core/api_client.dart';
import '../models/doctor.dart'; // seu model Doctor

class DoctorsPage {
  final List<Doctor> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  DoctorsPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });

  factory DoctorsPage.fromJson(Map<String, dynamic> j) => DoctorsPage(
        items: (j['items'] as List)
            .map((e) => Doctor.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
        total: j['total'] ?? 0,
        page: j['page'] ?? 1,
        pageSize: j['pageSize'] ?? 20,
        totalPages: j['totalPages'] ?? 1,
      );
}

class DoctorsService {
  Future<DoctorsPage> listPage({
    String q = '',
    int page = 1,
    int pageSize = 20,
  }) async {
    final resp = await ApiClient.I.get(
      '/doctors',
      query: {
        if (q.isNotEmpty) 'q': q,
        'page': page.toString(),
        'pageSize': pageSize.toString(),
      },
    );
    if (resp.statusCode != 200) {
      throw Exception('Erro ao listar médicos (${resp.statusCode})');
    }
    final decoded = jsonDecode(resp.body) as Map<String, dynamic>;
    return DoctorsPage.fromJson(decoded);
  }
}
