-- Cria os databases necessários caso ainda não existam.
-- Executado automaticamente pelo postgres na primeira inicialização.

SELECT 'CREATE DATABASE evolution'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'evolution')\gexec

SELECT 'CREATE DATABASE crm'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'crm')\gexec
