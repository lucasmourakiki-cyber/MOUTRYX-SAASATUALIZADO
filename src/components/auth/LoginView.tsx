import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MoutryxLogo } from '../common/MoutryxLogo';
import {
  Lock,
  Mail,
  User,
  Phone,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  Play,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginDemo, register, error, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Synchronous ref lock to prevent race conditions on rapid/repeated button clicks
  const isActionBusyRef = useRef(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCnpj, setRegCnpj] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regState, setRegState] = useState('MT');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionBusyRef.current || isSubmitting || isDemoSubmitting) {
      return;
    }
    setLocalError(null);
    clearError();

    if (!loginEmail || !loginPassword) {
      setLocalError('Preencha seu e-mail e senha.');
      return;
    }

    isActionBusyRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await login(loginEmail, loginPassword);
      if (!result.success) {
        setLocalError(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } finally {
      setIsSubmitting(false);
      isActionBusyRef.current = false;
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionBusyRef.current || isSubmitting || isDemoSubmitting) {
      return;
    }
    setLocalError(null);
    clearError();

    if (!regName.trim()) {
      setLocalError('Informe seu nome completo.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setLocalError('Informe um e-mail profissional válido.');
      return;
    }
    if (regPassword.length < 6) {
      setLocalError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!regCompanyName.trim()) {
      setLocalError('Informe o nome da sua empresa / operação.');
      return;
    }

    isActionBusyRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: 'proprietario',
        companyName: regCompanyName.trim(),
        tradeName: regCompanyName.trim(),
        cnpj: regCnpj.trim() || undefined,
        city: regCity.trim() || 'Sorriso',
        state: regState.trim() || 'MT',
        phone: regPhone,
      });
      if (!result.success) {
        setLocalError(result.error || 'Erro ao realizar cadastro.');
      }
    } finally {
      setIsSubmitting(false);
      isActionBusyRef.current = false;
    }
  };

  const handleDemoSubmit = async () => {
    if (isActionBusyRef.current || isSubmitting || isDemoSubmitting) {
      return;
    }
    setLocalError(null);
    clearError();
    isActionBusyRef.current = true;
    setIsDemoSubmitting(true);
    try {
      const result = await loginDemo();
      if (!result.success) {
        setLocalError(result.error || 'Não foi possível carregar a demonstração no momento.');
      }
    } finally {
      setIsDemoSubmitting(false);
      isActionBusyRef.current = false;
    }
  };

  const currentDisplayError = localError || error;

  return (
    <div className="min-h-screen w-full bg-[#F7F8F7] flex flex-col justify-center items-center p-4 sm:p-6 text-[#111827]">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#05521F_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <MoutryxLogo variant="stacked" size="lg" />
          </div>
          <p className="text-xs text-[#667085] font-semibold tracking-wide uppercase">
            SISTEMA OPERACIONAL AEROAGRÍCOLA & GESTÃO DE DRONES
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-white border border-[#E2E6E3] rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Tab Switcher */}
          <div className="flex rounded-xl bg-[#F7F8F7] p-1 mb-6 border border-[#E2E6E3]">
            <button
              id="tab-login"
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#05521F] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Acessar Sistema
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#05521F] text-white shadow-2xs'
                  : 'text-[#667085] hover:text-[#111827]'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Error Banner */}
          {currentDisplayError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-fadeIn">
              <AlertCircle className="h-4 w-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span>{currentDisplayError}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5" htmlFor="login-email">
                  E-mail Profissional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5" htmlFor="login-password">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#667085] hover:text-[#111827] cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={isSubmitting || isDemoSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white font-bold text-xs tracking-wide shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no MOUTRYX</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-name">
                  Nome Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-email">
                  E-mail Profissional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu.email@empresa.com.br"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-password">
                    Senha (mín. 6)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-8 pr-2 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-phone">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="reg-phone"
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="(66) 99999-9999"
                      className="w-full pl-8 pr-2 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-company-name">
                  Nome da Empresa / Operação Agrícola
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#667085]">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <input
                    id="reg-company-name"
                    type="text"
                    required
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="Ex: AeroVoo Pulverização Agrícola"
                    className="w-full pl-9 pr-3 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-city">
                    Cidade
                  </label>
                  <input
                    id="reg-city"
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Sorriso"
                    className="w-full px-2.5 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] placeholder-[#667085] focus:outline-none focus:border-[#05521F] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1" htmlFor="reg-state">
                    UF
                  </label>
                  <input
                    id="reg-state"
                    type="text"
                    maxLength={2}
                    value={regState}
                    onChange={(e) => setRegState(e.target.value.toUpperCase())}
                    placeholder="MT"
                    className="w-full px-2.5 py-2 bg-[#F7F8F7] border border-[#E2E6E3] rounded-xl text-xs text-[#111827] uppercase text-center focus:outline-none focus:border-[#05521F] focus:bg-white"
                  />
                </div>
              </div>

              {/* SaaS Isolated Tenant Guarantee */}
              <div className="rounded-xl bg-[#E7F3EA] p-2.5 border border-[#05521F]/20 text-[11px] text-[#05521F] flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-[#05521F] shrink-0 mt-0.5" />
                <span className="leading-tight text-[10.5px]">
                  <strong className="text-[#111827] font-bold">Ambiente Dedicado.</strong> Seu cadastro provisiona um ambiente SaaS isolado com gestão própria de drones, clientes, ordens de serviço e finanças.
                </span>
              </div>

              <button
                id="btn-register-submit"
                type="submit"
                disabled={isSubmitting || isDemoSubmitting}
                className="w-full mt-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white font-bold text-xs tracking-wide shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Criando Conta...</span>
                  </>
                ) : (
                  <>
                    <span>Criar Conta e Acessar</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Section Divider for Demo Mode */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E6E3]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-medium text-[#667085]">
                ou explore sem compromisso
              </span>
            </div>
          </div>

          {/* Demo Mode Button */}
          <button
            id="btn-demo-mode"
            type="button"
            onClick={handleDemoSubmit}
            disabled={isSubmitting || isDemoSubmitting}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#F0F5F2] hover:bg-[#E3EEE7] border border-[#B7D8C1] text-[#05521F] font-bold text-xs tracking-wide transition-all cursor-pointer shadow-2xs hover:border-[#05521F]/40 group disabled:opacity-50"
          >
            {isDemoSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-[#05521F]/30 border-t-[#05521F] rounded-full animate-spin" />
                <span>Iniciando Demonstração...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-[#05521F] group-hover:scale-110 transition-transform" />
                <span>Experimentar Modo Demo</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-[#667085] mt-2">
            Acesso instantâneo e guiado a dados de teste sem necessidade de cadastro ou cartão.
          </p>
        </div>

        {/* Footer Security Note */}
        <div className="mt-6 text-center text-[11px] text-[#667085] flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-[#05521F]" />
          <span>Ambiente seguro com criptografia e isolamento multi-tenant</span>
        </div>
      </div>
    </div>
  );
};
