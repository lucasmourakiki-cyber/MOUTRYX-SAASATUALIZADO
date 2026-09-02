import React, { useState } from 'react';
import { CheckCircle2, X, AlertTriangle, Camera, Ruler, Clock, User, Sprout, FileCheck } from 'lucide-react';
import { calculateAppliedPercentage } from '../../../utils/fieldOfflineStore';

interface FieldFinishModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  crop: string;
  contractedAreaHa: number;
  appliedAreaHa: number;
  startTime: string;
  finishTime: string;
  totalOccurrences: number;
  totalPhotos: number;
  onConfirmFinish: (finalNotes: string, isFullyCompleted: boolean) => void;
}

export const FieldFinishModal: React.FC<FieldFinishModalProps> = ({
  isOpen,
  onClose,
  clientName,
  crop,
  contractedAreaHa,
  appliedAreaHa,
  startTime,
  finishTime,
  totalOccurrences,
  totalPhotos,
  onConfirmFinish,
}) => {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const appliedPct = calculateAppliedPercentage(appliedAreaHa, contractedAreaHa);
  const remainingAreaHa = Math.max(0, Math.round((contractedAreaHa - appliedAreaHa) * 100) / 100);
  const isFullyCompleted = remainingAreaHa <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#111827] font-extrabold text-base">
            <CheckCircle2 className="h-6 w-6 text-[#05521F]" />
            <span>
              {isFullyCompleted ? 'Finalizar Operação' : 'Encerrar Trabalho do Dia (Área Pendente)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Structured Summary Card */}
        <div className="rounded-2xl bg-[#111827] p-5 text-white space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              RESUMO DA OPERAÇÃO
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isFullyCompleted
                  ? 'bg-[#05521F] text-white'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isFullyCompleted ? '100% Concluída' : `Saldo: ${remainingAreaHa.toLocaleString('pt-BR')} ha restantes`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <User className="h-3 w-3" /> Cliente
              </span>
              <p className="font-extrabold text-sm text-white truncate">{clientName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <Sprout className="h-3 w-3" /> Cultura
              </span>
              <p className="font-extrabold text-sm text-white">{crop}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <Ruler className="h-3 w-3" /> Área Contratada
              </span>
              <p className="font-bold text-white/90">{contractedAreaHa.toLocaleString('pt-BR')} ha</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <FileCheck className="h-3 w-3 text-[#667085]" /> Área Aplicada
              </span>
              <p className="font-extrabold text-[#667085]">
                {appliedAreaHa.toLocaleString('pt-BR')} ha ({appliedPct}%)
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" /> Horários
              </span>
              <p className="font-bold text-white/90">
                {startTime || '--:--'} às {finishTime || '--:--'}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-white/60 text-[10px] uppercase font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Registros no Campo
              </span>
              <p className="font-bold text-white/90">
                {totalOccurrences} ocorrências • {totalPhotos} fotos
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Badge / Alert for Remaining Area */}
        {!isFullyCompleted ? (
          <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-1 text-xs text-amber-950 shadow-xs">
            <div className="flex items-center gap-2 font-black text-amber-900">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>OPERAÇÃO CONTINUARÁ EM ANDAMENTO</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Foram aplicados <strong>{appliedAreaHa.toLocaleString('pt-BR')} ha</strong> de <strong>{contractedAreaHa.toLocaleString('pt-BR')} ha</strong> contratados. Ao encerrar o dia, a mesma OS permanecerá na aba <strong>EM ANDAMENTO</strong> com saldo de <strong>{remainingAreaHa.toLocaleString('pt-BR')} ha</strong> pendentes para retomada.
            </p>
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 rounded-2xl border-2 border-emerald-300 space-y-1 text-xs text-emerald-950 shadow-xs">
            <div className="flex items-center gap-2 font-black text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>ÁREA TOTAL 100% CONCLUÍDA ({contractedAreaHa.toLocaleString('pt-BR')} ha)</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Toda a área contratada foi cumprida. A OS será marcada como <strong>CONCLUÍDA</strong> e ficará disponível na aba Concluídas com o registro oficial da data de finalização.
            </p>
          </div>
        )}

        {/* Final Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Observações Finais do Piloto (Opcional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              !isFullyCompleted
                ? "Ex: Aplicação pausada no dia por vento forte. Retomaremos amanhã a partir do saldo restante..."
                : "Ex: Aplicação 100% concluída sem desvios, lavoura limpa..."
            }
            className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
          />
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-[11px] text-[#111827] font-medium">
          🔒 <strong>Garantia Offline:</strong> Todos os dados e fotos ficam salvos no aparelho e não são perdidos em caso de retomada ou continuidade.
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-300 py-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmFinish(notes.trim(), isFullyCompleted);
              onClose();
            }}
            className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black shadow-lg transition-colors cursor-pointer ${
              isFullyCompleted
                ? 'bg-[#111827] hover:bg-[#111827] text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <CheckCircle2 className={`h-4 w-4 ${isFullyCompleted ? 'text-[#667085]' : 'text-slate-950'}`} />
            <span>{isFullyCompleted ? 'Confirmar Conclusão Total' : 'Encerrar Dia (Em Andamento)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
