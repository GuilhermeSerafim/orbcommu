create unique index pedido_ativo_unico on orbcommu.pedidos (comunidade, telefone)
where encerrado_em is null;
