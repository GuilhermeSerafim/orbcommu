alter table orbcommu.operadores
  add column perfil text not null default 'leitura'
  check (perfil in ('leitura', 'operacao'));
