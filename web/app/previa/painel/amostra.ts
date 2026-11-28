import type { FiltroFila, ItemFila, PaginaFila } from "@/lib/fila"
import type { ResumoFila } from "@/lib/painel-fila"

const hora = 3_600_000
const dia = 24 * hora
const referencia = Date.now()
const calendario = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" })
const canais = ["QR do encontro", "Link da comunidade", "Bio do evento"]
const exemplos: [nome: string, horasDesdePedido: number, situacao: string][] = [
  ["Marta Luz", 840, "Entrada confirmada"],
  ["Nina Avelar", 480, "Prazo encerrado"],
  ["Raul Costa", 360, "Entrada confirmada"],
  ["Bia Paiva", 288, "Entrada confirmada"],
  ["Caio Prado", 240, "Desistiu"],
  ["Davi Ramos", 120, "Entrada confirmada"],
  ["Lia Moura", 96, "Entrada confirmada"],
  ["Iara Teles", 72, "Convite enviado"],
  ["Ravi Serra", 48, "Convite enviado"],
  ["Téo Lins", 36, "Aguardando vaga"],
  ["Ana Rios", 22, "Para analisar"],
  ["Nara Dias", 18, "Chamada iniciada"],
  ["Joana Neri", 15, "Entrada confirmada"],
  ["Leo Vale", 12, "Convite enviado"],
  ["Luna Neves", 10, "Aguardando vaga"],
  ["Pedro Vaz", 6, "Chamada iniciada"],
  ["Sara Maia", 4, "Para analisar"],
  ["Clara Leal", 2, "Para analisar"],
]

const pedidos: ItemFila[] = exemplos.map(([nome, horasDesdePedido, situacao], i) => {
  const recebido = referencia - horasDesdePedido * hora
  const aprovado = situacao !== "Para analisar"
  const encerrado = ["Entrada confirmada", "Prazo encerrado", "Desistiu"].includes(situacao)
  const enviado = situacao === "Convite enviado" || encerrado
  return {
    id: String(i + 1), nome, telefone: "550090000" + String(i + 1).padStart(4, "0"), motivacao: null,
    origem: canais[i % canais.length], situacao, recebidoEm: new Date(recebido).toISOString(),
    conversadoEm: null, conversadoPorNome: null, reservaId: null,
    aprovadoEm: aprovado ? new Date(recebido + hora).toISOString() : null,
    aprovadoPor: null, aprovadoPorNome: aprovado ? "Equipe de exemplo" : null,
    enviadoEm: enviado ? new Date(recebido + 2 * hora).toISOString() : null,
    enviadoPorNome: enviado ? "Equipe de exemplo" : null,
    encerradoEm: encerrado ? new Date(recebido + (situacao === "Prazo encerrado" ? 27 : 3) * hora).toISOString() : null,
    encerradoPorNome: encerrado ? "Equipe de exemplo" : null,
  }
})

function prazo(item: ItemFila) {
  return item.situacao === "Convite enviado" && item.enviadoEm ? Date.parse(item.enviadoEm) + dia : null
}

function situacaoAtual(item: ItemFila, agora: number) {
  const limite = prazo(item)
  return limite !== null && limite <= agora ? "A conferir" : item.situacao
}

function proximaConferencia(itens: ItemFila[], agora: number) {
  const prazos = itens.map(prazo).filter((limite): limite is number => limite !== null && limite > agora)
  return prazos.length ? Math.min(...prazos) - agora : null
}

export function listarExemplos(filtro: FiltroFila): PaginaFila {
  const agora = Date.now()
  const busca = filtro.busca.trim().toLocaleLowerCase("pt-BR")
  const digitos = /^[+()\d\s.-]+$/.test(busca) ? busca.replace(/\D/g, "") : ""
  const situacao = filtro.situacao === "Envio a confirmar" ? "Chamada iniciada" : filtro.situacao
  const candidatos = pedidos.filter(item =>
    (!filtro.pedidoId || item.id === filtro.pedidoId) &&
    (item.nome.toLocaleLowerCase("pt-BR").includes(busca) || Boolean(digitos && item.telefone.includes(digitos))),
  )
  const filtrados = candidatos.filter(item => situacao === "Todos" ||
    (situacao === "Finalizados" ? item.encerradoEm !== null : situacaoAtual(item, agora) === situacao))
  const inicio = (filtro.pagina - 1) * filtro.tamanho
  return {
    itens: filtrados.slice(inicio, inicio + filtro.tamanho).map(item => ({ ...item, situacao: situacaoAtual(item, agora) })),
    total: filtrados.length,
    atualizarEmMs: proximaConferencia(candidatos, agora),
  }
}

function agruparPorOrigem(coorte: ItemFila[]) {
  const porOrigem = new Map<string, { nome: string; pedidos: number; entradasConfirmadas: number }>()
  for (const item of coorte) {
    const origem = porOrigem.get(item.origem) ?? { nome: item.origem, pedidos: 0, entradasConfirmadas: 0 }
    origem.pedidos++
    if (item.situacao === "Entrada confirmada") origem.entradasConfirmadas++
    porOrigem.set(item.origem, origem)
  }
  return Array.from(porOrigem.values()).sort((a, b) => b.entradasConfirmadas - a.entradasConfirmadas ||
    b.pedidos - a.pedidos || a.nome.localeCompare(b.nome, "pt-BR"))
}

export function resumirExemplos(dias: ResumoFila["dias"]): ResumoFila {
  const agora = Date.now()
  const hoje = calendario.format(agora)
  function recebidosEm(n: number) {
    const inicio = new Date(Date.parse(hoje + "T00:00:00Z") - (n - 1) * dia).toISOString().slice(0, 10)
    return pedidos.filter(item => calendario.format(new Date(item.recebidoEm)) >= inicio)
  }
  const mes = recebidosEm(30)
  const coorte = dias === 30 ? mes : recebidosEm(dias)
  const divulgacoesDoMes = agruparPorOrigem(mes)
  const analise = pedidos.filter(item => item.situacao === "Para analisar")
  return {
    dias,
    atuais: {
      paraAnalisar: analise.length,
      aguardandoVaga: pedidos.filter(item => item.situacao === "Aguardando vaga").length,
      chamadaIniciada: pedidos.filter(item => item.situacao === "Chamada iniciada").length,
      aConferir: pedidos.filter(item => situacaoAtual(item, agora) === "A conferir").length,
      esperaMaisAntigaMs: analise.length ? agora - Math.min(...analise.map(item => Date.parse(item.recebidoEm))) : null,
    },
    funil: {
      recebidos: coorte.length,
      aprovados: coorte.filter(item => item.aprovadoEm).length,
      convitesEnviados: coorte.filter(item => item.enviadoEm).length,
      entradasConfirmadas: coorte.filter(item => item.situacao === "Entrada confirmada").length,
    },
    escala: { pedidos: mes.length, entradasPorOrigem: divulgacoesDoMes[0]?.entradasConfirmadas ?? 0 },
    divulgacoes: dias === 30 ? divulgacoesDoMes : agruparPorOrigem(coorte),
    atualizarEmMs: proximaConferencia(pedidos, agora),
  }
}
