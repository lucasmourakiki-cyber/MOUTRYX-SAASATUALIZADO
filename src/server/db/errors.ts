/**
 * ============================================================================
 * MOUTRYX GESTÃO AEROAGRÍCOLA — DATABASE & TRANSACTION ERROR CLASSES
 * ============================================================================
 */

export class ConcurrencyConflictError extends Error {
  public statusCode: number = 409;
  public conflict: boolean = true;

  constructor(message?: string) {
    super(
      message ||
        'Este registro foi alterado por outro usuário desde que você o carregou. Atualize os dados antes de tentar novamente.'
    );
    this.name = 'ConcurrencyConflictError';
    Object.setPrototypeOf(this, ConcurrencyConflictError.prototype);
  }
}

export class TransactionRollbackError extends Error {
  public statusCode: number = 500;

  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'TransactionRollbackError';
    Object.setPrototypeOf(this, TransactionRollbackError.prototype);
  }
}

export class EntityNotFoundError extends Error {
  public statusCode: number = 404;

  constructor(entityName: string, id: string) {
    super(`${entityName} com ID '${id}' não foi encontrado.`);
    this.name = 'EntityNotFoundError';
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

export class ProductionInfrastructureError extends Error {
  public readonly code: string = 'FAIL_CLOSED';
  public readonly isFailClosed: boolean = true;
  public statusCode: number = 500;

  constructor(message: string, public readonly details?: any) {
    super(message);
    this.name = 'ProductionInfrastructureError';
    Object.setPrototypeOf(this, ProductionInfrastructureError.prototype);
  }
}

