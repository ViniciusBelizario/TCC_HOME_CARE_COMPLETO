// file: src/utils/dates.js
// Versão simples, sem date-fns / date-fns-tz.
// Assume que o cliente envia ISO (ex.: "2025-09-03T13:00:00.000Z").
// Se vier string sem timezone, o Node interpreta como horário local do servidor.

function toUTC(dateOrString) {
  if (!dateOrString) return null;
  const d = (typeof dateOrString === 'string') ? new Date(dateOrString) : dateOrString;
  if (isNaN(d.getTime())) throw new Error('Data inválida');
  return d;
}

module.exports = { toUTC };
