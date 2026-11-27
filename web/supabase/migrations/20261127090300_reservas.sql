alter table orbcommu.pedidos
  add column reserva_id uuid,
  add column enviado_em timestamptz,
  add column enviado_por uuid,
  add column enviado_por_nome text;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'orbcommu_web') then
    grant select (reserva_id, enviado_em, enviado_por, enviado_por_nome),
          update (reserva_id, enviado_em, enviado_por, enviado_por_nome)
      on orbcommu.pedidos to orbcommu_web;
  end if;
end;
$$;
