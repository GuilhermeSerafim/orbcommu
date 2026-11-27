create table orbcommu.divulgacoes (
  id uuid primary key,
  comunidade text not null,
  nome text not null check (length(trim(nome)) between 1 and 100),
  inicio timestamptz not null,
  fim timestamptz not null check (fim > inicio),
  encerrada_em timestamptz,
  unique (id, comunidade)
);
create index divulgacoes_comunidade_inicio on orbcommu.divulgacoes (comunidade, inicio desc);

alter table orbcommu.pedidos add column divulgacao_id uuid;
alter table orbcommu.pedidos add foreign key (divulgacao_id, comunidade)
  references orbcommu.divulgacoes (id, comunidade);
create index pedidos_divulgacao on orbcommu.pedidos (divulgacao_id) where divulgacao_id is not null;

create table orbcommu.aberturas_divulgacao (
  visita uuid primary key,
  divulgacao_id uuid not null references orbcommu.divulgacoes on delete cascade,
  instante timestamptz not null default statement_timestamp()
);
create index aberturas_por_divulgacao on orbcommu.aberturas_divulgacao (divulgacao_id, instante);
revoke all on orbcommu.divulgacoes, orbcommu.aberturas_divulgacao from public, anon, authenticated;
do $$
begin
  if exists (select from pg_roles where rolname = 'orbcommu_web') then
    grant select, insert (id, comunidade, nome, inicio, fim), update (encerrada_em)
      on orbcommu.divulgacoes to orbcommu_web;
    grant select, insert (visita, divulgacao_id) on orbcommu.aberturas_divulgacao to orbcommu_web;
    grant select (divulgacao_id), insert (divulgacao_id) on orbcommu.pedidos to orbcommu_web;
  end if;
end;
$$;
