import "server-only"
import type { Acesso } from "./acesso"
import { getPool } from "./db"
import { fusoEvento } from "./periodo-divulgacao"

export type ResumoFila = {
  dias: 7 | 30
  atuais: {
    paraAnalisar: number
    aguardandoVaga: number
    chamadaIniciada: number
    aConferir: number
    esperaMaisAntigaMs: number | null
  }
  funil: {
    recebidos: number
    aprovados: number
    convitesEnviados: number
    entradasConfirmadas: number
  }
  escala: { pedidos: number; entradasPorOrigem: number }
  divulgacoes: { nome: string; pedidos: number; entradasConfirmadas: number }[]
  atualizarEmMs: number | null
}

export async function obterResumoFila(
  operador: Extract<Acesso, { tipo: "operador" }>,
  dias: ResumoFila["dias"] = 7,
): Promise<ResumoFila> {
  const { rows } = await getPool().query<ResumoFila>(
    `with periodo as (
       select ((statement_timestamp() at time zone $3)::date - ($2::int - 1))::timestamp at time zone $3 as inicio,
              ((statement_timestamp() at time zone $3)::date - 29)::timestamp at time zone $3 as inicio_mes
     ), pedidos as (
       select situacao, origem, recebido_em, aprovado_em, enviado_em,
              recebido_em >= periodo.inicio as na_coorte,
              recebido_em >= periodo.inicio_mes as no_mes,
              encerrado_em is null as aberto,
              case when situacao = 'Convite enviado' and encerrado_em is null
                then enviado_em + interval '24 hours' end as prazo
       from orbcommu.pedidos cross join periodo
       where comunidade = $1 and recebido_em <= statement_timestamp()
         and (encerrado_em is null or recebido_em >= periodo.inicio_mes)
     ), origens as (
       select origem as nome, count(*) filter (where na_coorte) as pedidos,
              count(*) filter (where na_coorte and situacao = 'Entrada confirmada') as "entradasConfirmadas",
              count(*) filter (where situacao = 'Entrada confirmada') as entradas_mes
       from pedidos where no_mes group by origem
     ), ranking as (
       select nome, pedidos, "entradasConfirmadas" from origens where pedidos > 0
       order by "entradasConfirmadas" desc, pedidos desc, nome limit 5
     )
     select $2::int as dias,
            json_build_object(
              'paraAnalisar', count(*) filter (where aberto and situacao = 'Para analisar'),
              'aguardandoVaga', count(*) filter (where aberto and situacao = 'Aguardando vaga'),
              'chamadaIniciada', count(*) filter (where aberto and situacao = 'Chamada iniciada'),
              'aConferir', count(*) filter (where prazo <= statement_timestamp()),
              'esperaMaisAntigaMs', floor(extract(epoch from statement_timestamp() -
                 min(recebido_em) filter (where aberto and situacao = 'Para analisar')) * 1000)
            ) as atuais,
            json_build_object(
              'recebidos', count(*) filter (where na_coorte),
              'aprovados', count(*) filter (where na_coorte and aprovado_em is not null),
              'convitesEnviados', count(*) filter (where na_coorte and enviado_em is not null),
              'entradasConfirmadas', count(*) filter (where na_coorte and situacao = 'Entrada confirmada')
            ) as funil,
            json_build_object('pedidos', count(*) filter (where no_mes),
              'entradasPorOrigem', coalesce((select max(entradas_mes) from origens), 0)) as escala,
            coalesce((select json_agg(o order by o."entradasConfirmadas" desc, o.pedidos desc, o.nome)
                      from ranking o), '[]') as divulgacoes,
            ceil(extract(epoch from min(prazo) filter (where prazo > statement_timestamp())
                 - statement_timestamp()) * 1000)::float8 as "atualizarEmMs"
     from pedidos`,
    [operador.comunidade, dias, fusoEvento],
  )
  return rows[0]
}
