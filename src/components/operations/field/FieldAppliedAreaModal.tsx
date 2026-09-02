import React, { useState } from 'react';
import { Ruler, X, Check, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { calculateAppliedPercentage } from '../../../utils/fieldOfflineStore';

interface FieldAppliedAreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractedAreaHa: number;
  initialAppliedHa?: number;
  onSave: (data: { appliedAreaHa: number; appliedPercentage: number }) => void;
}

export const FieldAppliedAreaModal: React.FC<FieldAppliedAreaModalProps> = ({
  isOpen,
  onClose,
  contractedAreaHa,
  initialAppliedHa = 0,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  if (!isOpen) return null;

  const numInput = parseFloat(inputValue.replace(',', '.')) || 0;
  const isOverContracted = numInput > contractedAreaHa;
  const remainingAreaHa = Math.max(0, Math.round((contractedAreaHa - numInput) * 100) / 100);
  const percentage = calculateAppliedPercentage(numInput, contractedAreaHa);
  const isFullyCompleted = numInput >= contractedAreaHa && !isOverContracted;
  const isValid = numInput > 0 && !isOverContracted;

  const handleConfirm = () => {
    if (!isValid) return;
    onSave({
      appliedAreaHa: numInput,
      appliedPercentage: percentage,
    });
    setInputValue('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#111827] font-extrabold text-base">
            <Ruler className="h-5 w-5 text-[#05521F]" />
            <span>Informar Área Aplicada Acumulada</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contracted & Previous Area Badges */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Área Contratada
            </span>
            <span className="text-lg font-black text-[#111827]">
              {contractedAreaHa.toLocaleString('pt-BR')} ha
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Já Aplicado Anterior
            </span>
            <span className="text-lg font-black text-amber-900">
              {initialAppliedHa.toLocaleString('pt-BR')} ha
            </span>
          </div>
        </div>

        {/* Quick Fill Button: 100% Concluído */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputValue(String(contractedAreaHa))}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Concluir 100% ({contractedAreaHa.toLocaleString('pt-BR')} ha)</span>
          </button>
        </div>

        {/* Applied Input Field (Cumulative) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            Área total aplicada acumulada até agora (ha)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ex: ${contractedAreaHa}`}
              className={`w-full text-center text-3xl font-black rounded-2xl border-2 p-4 focus:outline-hidden bg-[#F7F8F7]/50 ${
                isOverContracted
                  ? 'border-rose-500 text-rose-700 bg-rose-50/50'
                  : 'border-[#05521F]/50 focus:border-[#05521F] text-[#111827]'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
              ha
            </span>
          </div>
        </div>

        {/* ERROR: Value exceeds contracted area */}
        {isOverContracted && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 flex items-start gap-2.5 text-rose-900 text-xs font-bold animate-in zoom-in-95">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-rose-700">
                A área aplicada não pode ser maior que a área contratada.
              </p>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                Máximo permitido: {contractedAreaHa.toLocaleString('pt-BR')} ha (informado:{' '}
                {numInput.toLocaleString('pt-BR')} ha).
              </p>
            </div>
          </div>
        )}

        {/* Real-time Math Calculation Preview */}
        {numInput > 0 && !isOverContracted && (
          <div
            className={`p-4 rounded-2xl border-2 text-center space-y-2 animate-in zoom-in-95 ${
              isFullyCompleted
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold border-b pb-2 border-current/10">
              <span>Área Acumulada: <strong>{numInput.toLocaleString('pt-BR')} ha</strong></span>
              <span>
                {isFullyCompleted ? (
                  <span className="text-emerald-700 font-black flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saldo: 0 ha (Concluída)
                  </span>
                ) : (
                  <span className="text-amber-800 font-black">
                    Restante: {remainingAreaHa.toLocaleString('pt-BR')} ha (Em Andamento)
                  </span>
                )}
              </span>
            </div>

            <div className="text-sm font-extrabold">
              Progresso: {percentage.toLocaleString('pt-BR')}% ({numInput.toLocaleString('pt-BR')} de{' '}
              {contractedAreaHa.toLocaleString('pt-BR')} ha)
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isFullyCompleted ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600">
          💡 <strong>Nota:</strong> O valor digitado é a <strong>área total acumulada</strong> executada até o momento. O sistema calcula automaticamente o saldo restante.
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid}
            onClick={handleConfirm}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-extrabold shadow-md transition-all cursor-pointer ${
              isValid
                ? 'bg-[#111827] hover:bg-[#111827] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Check className="h-4 w-4" /> Confirmar Área
          </button>
        </div>
      </div>
    </div>
  );
};
