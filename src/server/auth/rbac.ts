import { UserRole } from '../../types';
import { SafeUser } from './userStore';

/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — MATRIZ CENTRALIZADA DE PERMISSÕES SERVER-SIDE (RBAC)
 * ============================================================================
 * Esta matriz define a autoridade definitiva e granular de controle de acesso (RBAC).
 * Toda e qualquer operação ou mutation crítica é validada no backend através deste módulo.
 */

export type Permission =
  // Dashboard & Visualização Geral
  | 'dashboard.read'

  // Gestão de Clientes
  | 'clients.read'
  | 'clients.create'
  | 'clients.update'
  | 'clients.delete'

  // Gestão de Propriedades & Fazendas
  | 'properties.read'
  | 'properties.create'
  | 'properties.update'
  | 'properties.delete'

  // Gestão de Talhões & Georreferenciamento
  | 'talhoes.read'
  | 'talhoes.create'
  | 'talhoes.update'
  | 'talhoes.delete'

  // Gestão Agronômica & Fitossanitária (Catálogo AGROFIT / MAPA)
  | 'agronomy.read'
  | 'agronomy.create'
  | 'agronomy.update'
  | 'agronomy.delete'

  // Frota — Drones Agrícolas
  | 'drones.read'
  | 'drones.create'
  | 'drones.update'
  | 'drones.delete'

  // Frota — Baterias Inteligentes & Ciclos
  | 'batteries.read'
  | 'batteries.create'
  | 'batteries.update'
  | 'batteries.delete'

  // Frota — Manutenções & Preventivas
  | 'maintenance.read'
  | 'maintenance.create'
  | 'maintenance.update'
  | 'maintenance.delete'

  // Pilotos & Equipe Operacional
  | 'pilots.read'
  | 'pilots.create'
  | 'pilots.update'
  | 'pilots.delete'

  // Comercial — Orçamentos & Propostas
  | 'quotes.read'
  | 'quotes.create'
  | 'quotes.update'
  | 'quotes.delete'
  | 'quotes.convert'

  // Operações — Ordens de Serviço (OS)
  | 'serviceOrders.read'
  | 'serviceOrders.create'
  | 'serviceOrders.update'
  | 'serviceOrders.delete'
  | 'serviceOrders.execute'
  | 'serviceOrders.complete'

  // Modo Campo (Field Mode)
  | 'fieldMode.read'
  | 'fieldMode.execute'

  // Financeiro — Contas a Receber, Pagar e Fluxo de Caixa
  | 'finance.read'
  | 'finance.create'
  | 'finance.update'
  | 'finance.delete'
  | 'finance.receive'
  | 'finance.pay'

  // Comissões de Pilotos
  | 'commissions.read'
  | 'commissions.create'
  | 'commissions.update'
  | 'commissions.approve'

  // Notinhas de Campo, Despesas & Reembolsos
  | 'reimbursements.read'
  | 'reimbursements.create'
  | 'reimbursements.update'
  | 'reimbursements.approve'

  // Relatórios & Exportações Sensíveis
  | 'reports.read'
  | 'reports.export'

  // Administração de Usuários
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.delete'

  // Configurações & Dados da Empresa
  | 'settings.read'
  | 'settings.update'

  // Inteligência Artificial & Copiloto DRONE IA
  | 'ai.chat'
  | 'ai.intelligence';

/**
 * Matriz de Permissões por Perfil (Role)
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // SUPER ADMIN: Acesso irrestrito a todas as funcionalidades e gerenciamento global de tenants
  super_admin: [
    'dashboard.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'clients.delete',
    'properties.read',
    'properties.create',
    'properties.update',
    'properties.delete',
    'talhoes.read',
    'talhoes.create',
    'talhoes.update',
    'talhoes.delete',
    'agronomy.read',
    'agronomy.create',
    'agronomy.update',
    'agronomy.delete',
    'drones.read',
    'drones.create',
    'drones.update',
    'drones.delete',
    'batteries.read',
    'batteries.create',
    'batteries.update',
    'batteries.delete',
    'maintenance.read',
    'maintenance.create',
    'maintenance.update',
    'maintenance.delete',
    'pilots.read',
    'pilots.create',
    'pilots.update',
    'pilots.delete',
    'quotes.read',
    'quotes.create',
    'quotes.update',
    'quotes.delete',
    'quotes.convert',
    'serviceOrders.read',
    'serviceOrders.create',
    'serviceOrders.update',
    'serviceOrders.delete',
    'serviceOrders.execute',
    'serviceOrders.complete',
    'fieldMode.read',
    'fieldMode.execute',
    'finance.read',
    'finance.create',
    'finance.update',
    'finance.delete',
    'finance.receive',
    'finance.pay',
    'commissions.read',
    'commissions.create',
    'commissions.update',
    'commissions.approve',
    'reimbursements.read',
    'reimbursements.create',
    'reimbursements.update',
    'reimbursements.approve',
    'reports.read',
    'reports.export',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'settings.read',
    'settings.update',
    'ai.chat',
    'ai.intelligence',
  ],

  // PROPRIETÁRIO: Acesso executivo total à sua empresa (operacional, comercial, financeiro, relatórios, usuários, IA)
  proprietario: [
    'dashboard.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'clients.delete',
    'properties.read',
    'properties.create',
    'properties.update',
    'properties.delete',
    'talhoes.read',
    'talhoes.create',
    'talhoes.update',
    'talhoes.delete',
    'agronomy.read',
    'agronomy.create',
    'agronomy.update',
    'agronomy.delete',
    'drones.read',
    'drones.create',
    'drones.update',
    'drones.delete',
    'batteries.read',
    'batteries.create',
    'batteries.update',
    'batteries.delete',
    'maintenance.read',
    'maintenance.create',
    'maintenance.update',
    'maintenance.delete',
    'pilots.read',
    'pilots.create',
    'pilots.update',
    'pilots.delete',
    'quotes.read',
    'quotes.create',
    'quotes.update',
    'quotes.delete',
    'quotes.convert',
    'serviceOrders.read',
    'serviceOrders.create',
    'serviceOrders.update',
    'serviceOrders.delete',
    'serviceOrders.execute',
    'serviceOrders.complete',
    'fieldMode.read',
    'fieldMode.execute',
    'finance.read',
    'finance.create',
    'finance.update',
    'finance.delete',
    'finance.receive',
    'finance.pay',
    'commissions.read',
    'commissions.create',
    'commissions.update',
    'commissions.approve',
    'reimbursements.read',
    'reimbursements.create',
    'reimbursements.update',
    'reimbursements.approve',
    'reports.read',
    'reports.export',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'settings.read',
    'settings.update',
    'ai.chat',
    'ai.intelligence',
  ],

  // ADMINISTRADOR: Gestão completa da operação, comercial, frota, financeiro e equipe na empresa
  administrador: [
    'dashboard.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'clients.delete',
    'properties.read',
    'properties.create',
    'properties.update',
    'properties.delete',
    'talhoes.read',
    'talhoes.create',
    'talhoes.update',
    'talhoes.delete',
    'agronomy.read',
    'agronomy.create',
    'agronomy.update',
    'agronomy.delete',
    'drones.read',
    'drones.create',
    'drones.update',
    'drones.delete',
    'batteries.read',
    'batteries.create',
    'batteries.update',
    'batteries.delete',
    'maintenance.read',
    'maintenance.create',
    'maintenance.update',
    'maintenance.delete',
    'pilots.read',
    'pilots.create',
    'pilots.update',
    'pilots.delete',
    'quotes.read',
    'quotes.create',
    'quotes.update',
    'quotes.delete',
    'quotes.convert',
    'serviceOrders.read',
    'serviceOrders.create',
    'serviceOrders.update',
    'serviceOrders.delete',
    'serviceOrders.execute',
    'serviceOrders.complete',
    'fieldMode.read',
    'fieldMode.execute',
    'finance.read',
    'finance.create',
    'finance.update',
    'finance.delete',
    'finance.receive',
    'finance.pay',
    'commissions.read',
    'commissions.create',
    'commissions.update',
    'commissions.approve',
    'reimbursements.read',
    'reimbursements.create',
    'reimbursements.update',
    'reimbursements.approve',
    'reports.read',
    'reports.export',
    'users.read',
    'users.create',
    'users.update',
    'users.delete',
    'settings.read',
    'settings.update',
    'ai.chat',
    'ai.intelligence',
  ],

  // GESTOR OPERACIONAL: Foco em campo, frota, pilotos, agendamento de OS, agronômico e orçamentos
  gestor_operacional: [
    'dashboard.read',
    'clients.read',
    'clients.create',
    'clients.update',
    'properties.read',
    'properties.create',
    'properties.update',
    'talhoes.read',
    'talhoes.create',
    'talhoes.update',
    'agronomy.read',
    'agronomy.create',
    'agronomy.update',
    'drones.read',
    'drones.create',
    'drones.update',
    'batteries.read',
    'batteries.create',
    'batteries.update',
    'maintenance.read',
    'maintenance.create',
    'maintenance.update',
    'pilots.read',
    'pilots.create',
    'pilots.update',
    'quotes.read',
    'quotes.create',
    'quotes.update',
    'quotes.convert',
    'serviceOrders.read',
    'serviceOrders.create',
    'serviceOrders.update',
    'serviceOrders.execute',
    'serviceOrders.complete',
    'fieldMode.read',
    'fieldMode.execute',
    'finance.read',
    'commissions.read',
    'reimbursements.read',
    'reimbursements.create',
    'reimbursements.update',
    'reports.read',
    'ai.chat',
    'ai.intelligence',
  ],

  // PILOTO: Execução de campo, check-in/status de OS, reporte de manutenção/baterias e envio de notinhas
  piloto: [
    'dashboard.read',
    'properties.read',
    'talhoes.read',
    'agronomy.read',
    'drones.read',
    'batteries.read',
    'batteries.update',
    'maintenance.read',
    'maintenance.create',
    'pilots.read',
    'serviceOrders.read',
    'serviceOrders.execute',
    'fieldMode.read',
    'fieldMode.execute',
    'commissions.read',
    'reimbursements.read',
    'reimbursements.create',
    'ai.chat',
  ],

  // FINANCEIRO: Gestão de contas a pagar, receber, baixas, conciliação, comissões, reembolsos e relatórios
  financeiro: [
    'dashboard.read',
    'clients.read',
    'quotes.read',
    'serviceOrders.read',
    'finance.read',
    'finance.create',
    'finance.update',
    'finance.delete',
    'finance.receive',
    'finance.pay',
    'commissions.read',
    'commissions.create',
    'commissions.update',
    'commissions.approve',
    'reimbursements.read',
    'reimbursements.create',
    'reimbursements.update',
    'reimbursements.approve',
    'reports.read',
    'reports.export',
    'ai.chat',
    'ai.intelligence',
  ],

  // CONSULTOR: Consulta agronômica, visualização de áreas, relatórios e ordens de serviço
  consultor: [
    'dashboard.read',
    'clients.read',
    'properties.read',
    'talhoes.read',
    'agronomy.read',
    'quotes.read',
    'serviceOrders.read',
    'reports.read',
    'ai.chat',
  ],
};

/**
 * Hierarquia de Perfis (Roles) para Controle de Escalação de Privilégios (Anti-Privilege Escalation)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  proprietario: 80,
  administrador: 60,
  gestor_operacional: 40,
  financeiro: 30,
  piloto: 20,
  consultor: 10,
};

/**
 * Verifica se o perfil do chamador (callerRole) tem autoridade hierárquica
 * para criar, alterar ou excluir um usuário com o perfil alvo (targetRole).
 */
export function canManageRole(callerRole: UserRole, targetRole: UserRole): boolean {
  if (callerRole === 'super_admin') {
    return true;
  }
  // Nenhum usuário não-super_admin pode gerenciar ou atribuir super_admin
  if (targetRole === 'super_admin') {
    return false;
  }
  // Proprietário tem autoridade plena sobre todos os perfis dentro do seu tenant
  if (callerRole === 'proprietario') {
    return true;
  }
  // Administrador só pode gerenciar perfis estritamente inferiores ao seu
  if (callerRole === 'administrador') {
    return (ROLE_HIERARCHY[callerRole] || 0) > (ROLE_HIERARCHY[targetRole] || 0);
  }
  // Outros perfis não possuem autoridade de gestão de usuários
  return false;
}

/**
 * Verifica se um determinado Role possui uma permissão específica.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === 'super_admin') {
    return true;
  }
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Retorna todas as permissões atribuídas a um Role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  if (role === 'super_admin') {
    return ROLE_PERMISSIONS.super_admin;
  }
  return ROLE_PERMISSIONS[role] || [];
}

export interface TenantAccessValidationResult {
  allowed: boolean;
  effectiveCompanyId?: string;
  reason?: string;
}

/**
 * Validação rigorosa de Tenant Server-Side & Anti-Spoofing:
 * - Super admin tem acesso global a qualquer tenant.
 * - Outros usuários só podem acessar ou modificar recursos da sua própria empresa (user.companyId).
 */
export function validateTenantAccess(
  user: { id?: string; name?: string; email?: string; role?: any; companyId?: string; active?: boolean } | null | undefined,
  targetCompanyId?: string
): TenantAccessValidationResult {
  if (!user || user.active === false) {
    return { allowed: false, reason: 'Usuário inativo ou inexistente.' };
  }
  if (user.role === 'super_admin') {
    return { allowed: true, effectiveCompanyId: targetCompanyId || user.companyId };
  }
  if (!targetCompanyId || targetCompanyId === user.companyId) {
    return { allowed: true, effectiveCompanyId: user.companyId };
  }
  return {
    allowed: false,
    reason: `Tentativa de acesso cruzado rejeitada. Usuário pertence ao tenant ${user.companyId}, requisitou ${targetCompanyId}.`,
  };
}
