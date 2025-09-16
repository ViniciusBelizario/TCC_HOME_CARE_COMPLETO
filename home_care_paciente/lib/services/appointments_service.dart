import 'dart:convert';
import '../core/api_client.dart';

enum ApptStatus { pending, confirmed, cancelled, completed }

ApptStatus parseStatus(String s) {
  switch (s) {
    case 'PENDING':
      return ApptStatus.pending;
    case 'CONFIRMED':
      return ApptStatus.confirmed;
    case 'COMPLETED':
      return ApptStatus.completed;
    case 'CANCELLED':
      return ApptStatus.cancelled;
    default:
      return ApptStatus.pending;
  }
}

class AppointmentItem {
  final int id;
  final DateTime startsAt;
  final DateTime endsAt;
  final String doctorName;
  final String patientName;
  final ApptStatus status;
  final String? notes;

  AppointmentItem({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    required this.doctorName,
    required this.patientName,
    required this.status,
    this.notes,
  });

  factory AppointmentItem.fromJson(Map<String, dynamic> j) => AppointmentItem(
        id: j['id'],
        startsAt: DateTime.parse(j['startsAt']).toLocal(),
        endsAt: DateTime.parse(j['endsAt']).toLocal(),
        doctorName: (j['doctor']?['name'] ?? 'Médico'),
        patientName: (j['patient']?['name'] ?? 'Paciente'),
        status: parseStatus(j['status']),
        notes: j['notes'],
      );
}

class AppointmentsService {
  Future<List<AppointmentItem>> my({String? status}) async {
    final resp = await ApiClient.I.get('/appointments/my',
        query: status != null ? {'status': status} : null);
    if (resp.statusCode == 200) {
      final arr = jsonDecode(resp.body) as List;
      return arr.map((e) => AppointmentItem.fromJson(e)).toList();
    }
    throw Exception('Erro ao carregar minhas consultas (${resp.statusCode})');
  }

  Future<AppointmentItem> create({required int slotId, String? notes}) async {
    final resp = await ApiClient.I.post(
      '/appointments',
      headers: {'Content-Type': 'application/json'},
      body: ApiClient.I
          .jsonBody({'slotId': slotId, if (notes != null) 'notes': notes}),
    );
    if (resp.statusCode == 201) {
      final j = jsonDecode(resp.body);
      // Para exibir na Home, pedimos /my depois — aqui devolvemos info básica
      return AppointmentItem(
        id: j['id'],
        startsAt: DateTime.parse(j['startsAt']).toLocal(),
        endsAt: DateTime.parse(j['endsAt']).toLocal(),
        doctorName: '',
        patientName: '',
        status: parseStatus(j['status']),
        notes: j['notes'],
      );
    }
    throw Exception('Erro ao agendar (${resp.statusCode})');
  }
}
