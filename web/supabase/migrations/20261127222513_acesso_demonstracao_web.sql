do $$
begin
  if exists (select from pg_roles where rolname = 'orbcommu_web') then
    grant insert (canal, contato, interesse), select (canal, contato)
      on orbcommu.inscricoes_demonstracao to orbcommu_web;
  end if;
end;
$$;
