create extension if not exists pg_cron;

do $$
begin
  if not exists (select from pg_roles where rolname = 'orbcommu_retencao') then
    create role orbcommu_retencao nologin;
  end if;
end;
$$;
grant orbcommu_retencao to current_user;
grant usage on schema orbcommu to orbcommu_retencao;
grant select (encerrado_em, comunidade), delete on orbcommu.pedidos to orbcommu_retencao;

create index pedidos_encerrado_em_idx on orbcommu.pedidos (encerrado_em)
  where encerrado_em is not null;

create function orbcommu.limpar_pedidos_vencidos(comunidade_alvo text default null)
returns integer language plpgsql security invoker set search_path = pg_catalog as $$
declare
  removidos integer;
begin
  delete from orbcommu.pedidos
    where encerrado_em <= now() - interval '2160 hours'
      and (comunidade_alvo is null or comunidade = comunidade_alvo);
  get diagnostics removidos = row_count;
  return removidos;
end;
$$;
revoke all on function orbcommu.limpar_pedidos_vencidos(text) from public, anon, authenticated;
do $$
begin
  if exists (select from pg_roles where rolname = 'orbcommu_web') then
    revoke all on function orbcommu.limpar_pedidos_vencidos(text) from orbcommu_web;
  end if;
end;
$$;
grant execute on function orbcommu.limpar_pedidos_vencidos(text) to orbcommu_retencao;

select cron.schedule('orbcommu-retencao', '* * * * *',
  'set local role orbcommu_retencao; select orbcommu.limpar_pedidos_vencidos();');
