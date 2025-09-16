import 'dart:convert';
import '../core/api_client.dart';

class Doctor {
  final int id;
  final String name;
  Doctor({required this.id, required this.name});

  factory Doctor.fromJson(Map<String, dynamic> j) =>
      Doctor(id: j['id'], name: j['name'] ?? 'Médico');
}

class DoctorsService {
  Future<List<Doctor>> list({String q = ''}) async {
    final resp = await ApiClient.I
        .get('/doctors', query: q.isNotEmpty ? {'q': q} : null);
    if (resp.statusCode == 200) {
      final arr = jsonDecode(resp.body) as List;
      return arr.map((e) => Doctor.fromJson(e)).toList();
    }
    throw Exception('Erro ao listar médicos (${resp.statusCode})');
  }
}
