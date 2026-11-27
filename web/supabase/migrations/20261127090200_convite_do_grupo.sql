create table orbcommu.convites_do_grupo (
  comunidade text primary key,
  convite text not null check (convite ~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]+$')
);

revoke all on orbcommu.convites_do_grupo from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'orbcommu_web') then
    grant select (comunidade, convite), insert (comunidade, convite), update (convite)
      on orbcommu.convites_do_grupo to orbcommu_web;
  end if;
end;
$$;
