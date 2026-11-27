import "server-only"
import { getPool } from "./db"
import type { PedidoValido } from "./entrada"
import { uuidValido } from "./periodo-divulgacao"

export type EstadoDivulgacao = "Agendada" | "Aberta" | "Encerrada"
export type Divulgacao = {
  id: string; nome: string; inicio: string; fim: string; estado: EstadoDivulgacao
}
export type ResumoDivulgacao = Divulgacao & { solicitantes: number }
export type ResultadoDivulgacao = {
  aberturas: number; solicitantes: number; confirmados: number; dias: { dia: string; aberturas: number }[]
}

const campos = `d.id, d.nome,
  to_char(d.inicio at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as inicio,
  to_char((d.fim at time zone 'America/Sao_Paulo')::date - 1, 'YYYY-MM-DD') as fim,
  case when d.encerrada_em is not null or d.fim <= statement_timestamp() then 'Encerrada'
       when d.inicio > statement_timestamp() then 'Agendada' else 'Aberta' end as estado`

export async function listarDivulgacoes(comunidade: string) {
  return (await getPool().query<ResumoDivulgacao>(
    `select ${campos}, (select count(distinct telefone)::int from orbcommu.pedidos p
        where p.divulgacao_id = d.id) as solicitantes
     from orbcommu.divulgacoes d where d.comunidade = $1 order by d.inicio desc, d.nome, d.id`, [comunidade])).rows
}

export async function obterDivulgacao(comunidade: string, id: string) {
  if (!uuidValido(id)) return null
  return (await getPool().query<Divulgacao>(
    `select ${campos} from orbcommu.divulgacoes d where d.comunidade = $1 and d.id = $2`, [comunidade, id])).rows[0] ?? null
}

export async function criarDivulgacao(comunidade: string, id: string, nome: string, inicio: string, fim: string) {
  const parametros = [comunidade, id, nome, inicio, fim]
  const pool = getPool()
  const resultado = await pool.query(
    `insert into orbcommu.divulgacoes (comunidade, id, nome, inicio, fim)
     select $1, $2, $3, $4::date::timestamp at time zone 'America/Sao_Paulo',
       ($5::date + 1)::timestamp at time zone 'America/Sao_Paulo'
     where $4::date >= (statement_timestamp() at time zone 'America/Sao_Paulo')::date
       and $5::date >= $4::date on conflict (id) do nothing returning id`, parametros)
  if (resultado.rowCount) return true
  const existente = await obterDivulgacao(comunidade, id)
  return existente?.nome === nome && existente.inicio === inicio && existente.fim === fim
}

export async function encerrarDivulgacao(comunidade: string, id: string) {
  if (!uuidValido(id)) return false
  const r = await getPool().query(`update orbcommu.divulgacoes set encerrada_em = statement_timestamp()
    where comunidade = $1 and id = $2 and encerrada_em is null and fim > statement_timestamp()`, [comunidade, id])
  return !!r.rowCount || (await obterDivulgacao(comunidade, id))?.estado === "Encerrada"
}

export async function resultadoDivulgacao(comunidade: string, id: string) {
  const r = await getPool().query<ResultadoDivulgacao>(`with dias as (
    select (a.instante at time zone 'America/Sao_Paulo')::date as dia, count(*)::int as aberturas
    from orbcommu.aberturas_divulgacao a join orbcommu.divulgacoes d on d.id = a.divulgacao_id
    where d.comunidade = $1 and d.id = $2 group by 1
  )
  select (select coalesce(sum(aberturas), 0)::int from dias) as aberturas,
    (select coalesce(json_agg(dias order by dia), '[]') from dias) as dias,
    count(distinct telefone)::int as solicitantes,
    (count(distinct telefone) filter (where situacao = 'Entrada confirmada'))::int as confirmados
  from orbcommu.pedidos where comunidade = $1 and divulgacao_id = $2`, [comunidade, id])
  return r.rows[0]
}

export async function registrarAbertura(comunidade: string, id: string, visita: string) {
  await getPool().query(`insert into orbcommu.aberturas_divulgacao (visita, divulgacao_id)
    select $3, id from orbcommu.divulgacoes where id = $2 and comunidade = $1 and encerrada_em is null
      and inicio <= statement_timestamp() and fim > statement_timestamp() on conflict (visita) do nothing`,
    [comunidade, id, visita])
}

export async function registrarPedidoDaDivulgacao(comunidade: string, id: string, pedido: PedidoValido) {
  if (!uuidValido(id)) return "invalida" as const
  // O encerramento precisa da mesma linha. A validade é conferida depois de obter o bloqueio.
  const r = await getPool().query<{ situacao: "aberta" | "agendada" | "encerrada" }>(`
    with edicao as materialized (
      select id, nome, inicio, fim, encerrada_em from orbcommu.divulgacoes
      where comunidade = $1 and id = $2 for share
    ), validade as materialized (
      select *, case when encerrada_em is not null or fim <= clock_timestamp() then 'encerrada'
        when inicio > clock_timestamp() then 'agendada' else 'aberta' end as situacao from edicao
    ), gravacao as (
      insert into orbcommu.pedidos (comunidade, divulgacao_id, nome, telefone, motivacao, origem, situacao)
      select $1, id, $3, $4, $5, nome, 'Para analisar' from validade where situacao = 'aberta'
      on conflict (comunidade, telefone) where encerrado_em is null do nothing
    ) select situacao from validade`, [comunidade, id, pedido.nome, pedido.telefone, pedido.motivacao])
  const estado = r.rows[0]?.situacao
  if (!estado) return "invalida" as const
  if (estado !== "aberta") return estado
}
