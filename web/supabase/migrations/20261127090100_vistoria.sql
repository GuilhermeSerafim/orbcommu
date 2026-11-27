alter table orbcommu.pedidos
  add column conversado_em timestamptz,
  add column conversado_por uuid,
  add column conversado_por_nome text,
  add column aprovado_em timestamptz,
  add column aprovado_por uuid,
  add column aprovado_por_nome text,
  add column encerrado_por uuid,
  add column encerrado_por_nome text;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'orbcommu_web') then
    grant update (situacao, conversado_em, conversado_por, conversado_por_nome,
                  aprovado_em, aprovado_por, aprovado_por_nome,
                  encerrado_em, encerrado_por, encerrado_por_nome)
      on orbcommu.pedidos to orbcommu_web;
  end if;
end;
$$;
