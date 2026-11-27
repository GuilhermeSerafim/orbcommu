alter table orbcommu.operadores
  add column superadmin boolean not null default false check (not superadmin or perfil = 'operacao'),
  add column versao_senha_aceita text;

-- A redefinição revoga também o acesso de uma aba aberta antes da rotação.
create function orbcommu.sessao_apos_redefinicao(p_usuario uuid, p_sessao uuid, p_desde timestamptz)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.sessions
    where user_id = p_usuario and id = p_sessao and created_at >= p_desde);
$$;
revoke all on function orbcommu.sessao_apos_redefinicao(uuid, uuid, timestamptz) from public, anon, authenticated;
do $$
begin
  if exists (select from pg_roles where rolname = 'orbcommu_web') then
    grant select (superadmin, versao_senha_aceita), update (versao_senha_aceita) on orbcommu.operadores to orbcommu_web;
    grant execute on function orbcommu.sessao_apos_redefinicao(uuid, uuid, timestamptz) to orbcommu_web;
  end if;
end $$;
