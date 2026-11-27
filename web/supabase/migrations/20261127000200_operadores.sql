create table orbcommu.operadores (
  comunidade text not null,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  primary key (comunidade, usuario_id)
);

revoke all on table orbcommu.operadores from public, anon, authenticated;
