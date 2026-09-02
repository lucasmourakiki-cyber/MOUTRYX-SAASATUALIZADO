# MOUTRYX GESTÃO AEROAGRÍCOLA — GUIA DE BANCO DE DADOS & PERSISTÊNCIA (ETAPA 8.5.4)

Este documento descreve a arquitetura de persistência, modelo relacional, estratégia de migração, concorrência e procedimentos operacionais de backup e restore da plataforma **MOUTRYX Gestão Aeroagrícola**.

---

## 1. Visão Geral da Arquitetura

A MOUTRYX adota um padrão de persistência corporativo baseado em **Repository Pattern** e **Inversion of Control (IoC)**, mantendo a camada de regras de negócio, autenticação, RBAC e isolamento multi-tenant 100% desacoplada do motor de banco de dados subjacente.

```
+-------------------------------------------------------------------------+
|                  MOUTRYX SERVER / EXPRESS ROUTING                      |
|           (/api/auth/login, /api/auth/register, /api/auth/me)           |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                      REPOSITORY ABSTRACTION LAYER                       |
|           IUserRepository  |  ICompanyRepository  |  ISessionRepository |
+-------------------------------------------------------------------------+
                                    |
               +--------------------+--------------------+
               | (DATABASE_URL ativa)                    | (DEVELOPMENT ONLY)
               v                                         v
+-----------------------------+           +------------------------------+
|     PostgreSQL Adapters     |           |    JSON File Store Adapters  |
|  - PostgresUserRepository   |           |  - JsonFileUserRepository    |
|  - PostgresCompanyRepository|           |  - JsonFileCompanyRepository |
|  - PostgresSessionRepository|           |  - JsonFileSessionRepository |
+-----------------------------+           +------------------------------+
               |                                         |
               v                                         v
+-----------------------------+           +------------------------------+
|  Cloud SQL / Neon / Supabase|           |     data/users.json          |
|    PostgreSQL 14+ Database  |           |     data/companies.json      |
+-----------------------------+           |     data/sessions.json       |
                                          +------------------------------+
```

---

## 2. Schema Relacional (PostgreSQL DDL)

O schema está localizado em `src/server/db/schema.sql` e a migration inicial em `src/server/db/migrations/001_initial_schema.sql`.

### 2.1. Tabela `companies` (Tenants)
```sql
CREATE TABLE companies (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    document VARCHAR(30),
    email VARCHAR(255),
    phone VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_companies_document ON companies(document);
CREATE INDEX idx_companies_active ON companies(active);
```

### 2.2. Tabela `users` (Usuários e Identidade)
```sql
CREATE TABLE users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'super_admin', 'proprietario', 'administrador', 
        'gestor_operacional', 'piloto', 'financeiro', 'consultor'
    )),
    company_id VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) 
        REFERENCES companies(id) ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_users_lower_email ON users (LOWER(email));
CREATE INDEX idx_users_company_id ON users (company_id);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_active ON users (active);
```

### 2.3. Tabela `sessions` (Sessões Persistentes & Auditoria de Revogação)
```sql
CREATE TABLE sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX idx_sessions_revoked_at ON sessions (revoked_at);
```

---

## 3. Variáveis de Ambiente Necessárias

As variáveis de ambiente devem ser declaradas no arquivo `.env` (baseando-se em `.env.example`):

| Variável | Obrigatório em Produção | Descrição | Exemplo |
|---|:---:|---|---|
| `DATABASE_URL` | **SIM** | String de conexão PostgreSQL | `postgresql://user:pass@ep-hostname.us-east-1.aws.neon.tech/moutryx_db?sslmode=require` |
| `SESSION_SECRET` | **SIM** | Segredo criptográfico HMAC-SHA256 (mínimo 32 caracteres) | `9f8e7d6c5b4a3210123456789abcdef0fedcba9876543210abcdef0123456789` |
| `PORT` | Sim (Container) | Porta do servidor web | `3000` |
| `GEMINI_API_KEY` | Opcional | Chave para o copiloto DRONE IA | `AIzaSy...` |

---

## 4. Estratégia de Migração Idempotente

Ao iniciar a aplicação, a função `bootstrapPersistence()`:
1. Testa a conexão com o PostgreSQL através da `DATABASE_URL`.
2. Se conectado, executa as migrações DDL em `schema.sql`.
3. Invoca o `migrationEngine.ts` que:
   - Garante que as empresas padrão (`comp-1` e `comp-2`) existam.
   - Lê os registros de `data/users.json` e os migra idempotentemente para a tabela `users`.
   - Preserva os hashes `scrypt` sem re-criptografia.
   - **Zero vazamento de credenciais nos logs**.

---

## 5. Procedimentos de Backup & Restore

### 5.1. Backup Completo do Banco de Dados
Para realizar um dump binário consistente de todas as tabelas:
```bash
pg_dump -d "$DATABASE_URL" -F c -b -v -f backup_moutryx_$(date +%Y%m%d_%H%M%S).dump
```

Para exportar apenas em SQL puro:
```bash
pg_dump -d "$DATABASE_URL" --inserts --clean --if-exists > backup_moutryx_schema_and_data.sql
```

### 5.2. Restauração do Banco de Dados
Para restaurar a partir do arquivo dump binário:
```bash
pg_restore -d "$DATABASE_URL" -v --clean --if-exists backup_moutryx_20260821_000000.dump
```

---

## 6. Concorrência e Isolamento Multi-Tenant

- **Unicidade de E-mail**: Garantida em nível de banco através do índice único `idx_users_lower_email`. Concorrências simultâneas de cadastro com mesmo e-mail disparam violação `23505`, tratada com retorno `409 Conflict`.
- **Isolamento de Tenant**: Todo `User` possui foreign key `company_id` vinculada a `companies(id)`. Endpoints e middlewares (`enforceTenantIsolation`) bloqueiam acessos e mutações entre tenants não autorizados.
- **Revogação de Sessão**: O logout persiste a revogação marcando `revoked_at = CURRENT_TIMESTAMP`, invalidando imediatamente o token em todas as instâncias do cluster.
