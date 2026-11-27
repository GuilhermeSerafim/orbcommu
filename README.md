# OrbCommu

O OrbCommu organiza pedidos de entrada em uma comunidade quando uma divulgação traz mais interessados do que o grupo consegue receber de imediato. A pessoa registra o pedido pelo celular. A equipe consulta a fila em ordem de chegada, faz a vistoria e escolhe quem convidar quando houver espaço.

## Experimentar o protótipo

Na raiz do repositório, sirva o diretório do protótipo com Python 3.

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory docs/prototipos
```

Abra [o ensaio local](http://127.0.0.1:4173/), selecione **Link geral** e envie um pedido com dados fictícios. Em **Fila da Joana**, o pedido aparece como **Para analisar**. O protótipo guarda os registros no navegador e simula as conversas de WhatsApp.

## Desenho do MVP

1. **Pedido e fila privada.** Um pedido ativo por número. A equipe acessa a mesma fila com contas individuais.
2. **Convite manual.** A equipe escolhe uma pessoa aprovada, envia o convite no WhatsApp e registra o envio. O prazo de 24 horas vale para solicitar entrada. Uma conferência posterior preserva o pedido feito no prazo.
3. **Divulgação por evento.** O link e o QR identificam a edição. O painel distingue aberturas, pedidos e entradas confirmadas.

A stack prevista para o piloto é Next.js com TypeScript no Render, PostgreSQL e autenticação no Supabase. A fila compartilhada entre aparelhos faz parte da primeira entrega da aplicação.

## Desenvolvimento

O GitHub Actions roda a suíte em pull requests e na `main`. Os comandos locais e os critérios de regressão de cada funcionalidade estão no [guia de testes e entrega](docs/qualidade-e-entrega.md).
