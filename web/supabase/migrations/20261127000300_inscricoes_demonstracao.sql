create table orbcommu.inscricoes_demonstracao (
  id bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  canal text not null check (canal in ('email', 'whatsapp')),
  contato text not null,
  interesse text not null check (interesse in ('demonstracao', 'edicao')),
  unique (canal, contato)
);

revoke all on table orbcommu.inscricoes_demonstracao from public, anon, authenticated;
revoke all on sequence orbcommu.inscricoes_demonstracao_id_seq from public, anon, authenticated;
