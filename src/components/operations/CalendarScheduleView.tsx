import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plane,
  User,
  AlertTriangle,
  Plus,
} from 'lucide-react';

interface CalendarScheduleViewProps {
  onOpenNewOS: () => void;
}

export const CalendarScheduleView: React.FC<CalendarScheduleViewProps> = ({ onOpenNewOS }) => {
  const { serviceOrders, pilots, drones } = useApp();

  const [currentDate, setCurrentDate] = useState<string>(() => {
    const today = new Date().toISOString().split('T')[0];
    const hasToday = serviceOrders.some((os) => os.scheduledDate === today);
    if (hasToday) return today;
    return serviceOrders[0]?.scheduledDate || today;
  });

  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  };

  const formattedDateLabel = React.useMemo(() => {
    try {
      const d = new Date(currentDate + 'T12:00:00');
      const formatted = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      const today = new Date().toISOString().split('T')[0];
      return `${formatted} ${currentDate === today ? '(Hoje)' : ''}`;
    } catch {
      return currentDate;
    }
  }, [currentDate]);

  // Conflict Detection: check if any pilot or drone is double-booked on same date
  const pilotBookings: Record<string, number> = {};
  const droneBookings: Record<string, number> = {};

  serviceOrders.forEach((os) => {
    if (os.scheduledDate === currentDate && os.status !== 'cancelado') {
      pilotBookings[os.pilotName] = (pilotBookings[os.pilotName] || 0) + 1;
      droneBookings[os.droneModel] = (droneBookings[os.droneModel] || 0) + 1;
    }
  });

  const conflicts: string[] = [];
  Object.entries(pilotBookings).forEach(([pilot, count]) => {
    if (count > 1) conflicts.push(`Piloto ${pilot} possui ${count} operações agendadas no mesmo dia!`);
  });
  Object.entries(droneBookings).forEach(([drone, count]) => {
    if (count > 1) conflicts.push(`Drone ${drone} possui ${count} agendamentos no mesmo dia!`);
  });

  const ordersForSelectedDate = serviceOrders.filter((os) => os.scheduledDate === currentDate);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Agenda & Escala Operacional</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Planejamento de voos, detecção de conflitos de pilotos/drones e alocação de equipes
          </p>
        </div>

        <button
          onClick={onOpenNewOS}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-bold transition-colors shadow-md cursor-pointer border border-[#05521F]/30"
        >
          <Plus className="h-4 w-4" /> Agendar Voo / OS
        </button>
      </div>

      {/* Conflict Warning Box */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Conflito de Escala Detectado pela MOUTRYX
          </div>
          {conflicts.map((c, idx) => (
            <p key={idx} className="pl-6 text-amber-800 font-medium">
              • {c}
            </p>
          ))}
        </div>
      )}

      {/* Date Picker Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer border border-slate-200"
            title="Dia Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold text-[#05521F] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 cursor-pointer"
          >
            Hoje
          </button>
          <span className="font-extrabold text-sm text-[#111827] capitalize">{formattedDateLabel}</span>
          <button
            onClick={handleNextDay}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer border border-slate-200"
            title="Próximo Dia"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={currentDate}
            onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 bg-slate-50 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-500">
            {ordersForSelectedDate.length} operações programadas
          </span>
        </div>
      </div>

      {/* Daily Scheduled Services */}
      <div className="space-y-3">
        {ordersForSelectedDate.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-slate-600">Nenhum voo ou OS agendada para esta data.</p>
            <p className="text-xs text-slate-400">Clique em "Agendar Voo / OS" para criar um agendamento nesta escala.</p>
          </div>
        ) : (
          ordersForSelectedDate.map((os) => (
            <div
              key={os.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/50 transition-all gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[#111827] text-white border border-[#05521F]/30">
                  <Clock className="h-4 w-4 text-[#667085]" />
                  <span className="text-[11px] font-black mt-0.5">{os.scheduledTime}</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#111827]">{os.osNumber}</span>
                    <span className="font-bold text-slate-800">• {os.clientName}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {os.propertyName} ({os.talhaoName}) • {os.crop} - {os.areaHa} ha
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" /> {os.pilotName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Plane className="h-3.5 w-3.5 text-slate-400" /> {os.droneModel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    os.status === 'em_operacao'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : os.status === 'concluido'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {os.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
