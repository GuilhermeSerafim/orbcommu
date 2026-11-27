create schema orbcommu;

create table orbcommu.pedidos (
  id bigint generated always as identity primary key,
  comunidade text not null,
  nome text not null,
  telefone text not null,
  motivacao text,
  origem text not null,
  situacao text not null,
  recebido_em timestamptz not null default now(),
  encerrado_em timestamptz
);

revoke all on schema orbcommu from public, anon, authenticated;
revoke all on table orbcommu.pedidos from public, anon, authenticated;
revoke all on sequence orbcommu.pedidos_id_seq from public, anon, authenticated;
