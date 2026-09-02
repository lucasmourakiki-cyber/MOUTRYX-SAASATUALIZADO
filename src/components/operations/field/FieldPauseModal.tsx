import React, { useState } from 'react';
import {
  Pause,
  X,
  Utensils,
  Fuel,
  Battery,
  Wind,
  Wrench,
  CheckCircle2,
} from 'lucide-react';

interface FieldPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPause: (reason: string) => void;
}

const PAUSE_REASONS = [
  {
    id: 'refeicao',
    label: 'Pausa para refeição / almoço',
    icon: Utensils,
    color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100',
    description: 'Intervalo para almoço ou lanche da equipe.',
  },
  {
    id: 'abastecimento',
    label: 'Abastecimento de calda / combustível',
    icon: Fuel,
    color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
    description: 'Reabastecimento de defensivos ou gerador.',
  },
  {
    id: 'bateria_manutencao',
    label: 'Troca de bateria / manutenção rápida',
    icon: Battery,
    color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
    description: 'Recarga/troca de baterias ou ajuste mecânico rápido.',
  },
  {
    id: 'clima_temporario',
    label: 'Condição climática temporária',
    icon: Wind,
    color: 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100',
    description: 'Pausa aguardando vento ou temperatura amenizar.',
  },
  {
    id: 'outro',
    label: 'Outro motivo de pausa',
    icon: Wrench,
    color: 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100',
    description: 'Outra interrupção temporária na operação.',
  },
];

export const FieldPauseModal: React.FC<FieldPauseModalProps> = ({
  isOpen,
  onClose,
  onConfirmPause,
}) => {
  const [selectedReasonId, setSelectedReasonId] = useState<string>('refeicao');
  const [customReason, setCustomReason] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const reasonObj = PAUSE_REASONS.find((r) => r.id === selectedReasonId);
    let finalReason = reasonObj?.label || 'Pausa operacional';
    if (selectedReasonId === 'outro' && customReason.trim()) {
      finalReason = customReason.trim();
    }
    onConfirmPause(finalReason);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-200 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/20 text-white shadow-inner">
              <Pause className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Pausar Operação
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                Selecione o motivo da pausa temporária
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Ao pausar, o horário inicial será registrado automaticamente. A operação permanecerá com status <strong className="text-amber-800">EM PAUSA</strong> até que você clique em <strong>RETOMAR OPERAÇÃO</strong>.
          </p>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {PAUSE_REASONS.map((item) => {
              const isSelected = selectedReasonId === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedReasonId(item.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-medium">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-slate-950'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom text field if 'outro' is selected */}
          {selectedReasonId === 'outro' && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Descreva o motivo da pausa:
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ex: Aguardando chegada do caminhão-pipa..."
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Pause className="h-4 w-4" />
            <span>CONFIRMAR PAUSA</span>
          </button>
        </div>
      </div>
    </div>
  );
};
