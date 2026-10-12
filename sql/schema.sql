-- Solo documentación: la tabla ya existe en Supabase. NO se ejecuta desde el servicio.
-- Esquema REAL (verificado contra information_schema), distinto al diseño original del CLAUDE.md:
--   id entero autoincremental, account_number NOT NULL, status varchar, user_id sin UNIQUE.
CREATE TABLE IF NOT EXISTS public.accounts (
    id              SERIAL          PRIMARY KEY,                 -- int4, nextval('accounts_id_seq')
    user_id         VARCHAR(36)     NOT NULL,
    account_number  VARCHAR(50)     NOT NULL,                    -- sin default: lo genera el servicio (ACC-##########)
    balance         NUMERIC(15, 2)  NOT NULL DEFAULT 0.00,
    currency        VARCHAR(3)      NOT NULL DEFAULT 'USD',
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Recomendado (no aplicado): evita cuentas duplicadas por carreras entre eventos del mismo usuario.
-- ALTER TABLE public.accounts ADD CONSTRAINT uq_accounts_user_id UNIQUE (user_id);
