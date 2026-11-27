"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { AcaoPedido, ResultadoAcao } from "../../lib/operacao"
import { agirNoPedido } from "./acoes"
import type { AberturaWhatsApp } from "./aba-whatsapp"
import { destinoDaConversa } from "../../lib/convite"

const mensagens = {
  sem_convite: "Para chamar esta pessoa, salve o convite em “Link do grupo”, no topo da fila.",
  acesso: "Esta sessão não tem permissão para alterar pedidos.",
  acao_invalida: "Não foi possível identificar a ação deste pedido.",
  pedido_alterado: "Este pedido mudou. Confira a situação atualizada.",
  indisponivel: "Não foi possível concluir a ação. Tente novamente.",
} satisfies Record<Extract<ResultadoAcao, { ok: false }>["motivo"], string>

const avisoChamada = "A resposta da chamada se perdeu. Confira a situação do pedido antes de continuar."

type Alternativa = { url: string; reservaId?: string }
type Props = {
  id: string
  situacao: string
  reservaId: string | null
  alternativaInicial?: Alternativa
  chamadaIncerta?: boolean
  aoChamar: (reservaId?: string, alternativa?: Alternativa) => void
  atualizar: () => void
  prepararAba: () => AberturaWhatsApp
}

export function AcoesDoPedido({ id, situacao, reservaId, alternativaInicial, chamadaIncerta, aoChamar, atualizar, prepararAba }: Props) {
  const emAndamento = useRef(false)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string | undefined>(chamadaIncerta ? avisoChamada : undefined)
  const [alternativa, setAlternativa] = useState(alternativaInicial)

  async function agir(acao: AcaoPedido, botao: HTMLButtonElement) {
    if (emAndamento.current) return
    emAndamento.current = true
    botao.focus()
    const conversa = ["conversar", "chamar", "reabrir"].includes(acao) ? prepararAba() : null
    setPendente(true)
    setErro(undefined)
    setAlternativa(undefined)

    try {
      const resultado = await agirNoPedido(id, acao, reservaId ?? undefined)
      if (!resultado.ok) {
        conversa?.cancelar()
        setErro(mensagens[resultado.motivo])
        if (resultado.motivo === "pedido_alterado" || resultado.motivo === "acesso") atualizar()
        return
      }
      if (resultado.urlWhatsApp) {
        const url = destinoDaConversa(resultado.urlWhatsApp, navigator)
        const alternativaBloqueada = conversa?.abrir(url) ? undefined : { url, reservaId: resultado.reservaId }
        setAlternativa(alternativaBloqueada)
        if (acao === "chamar" && resultado.reservaId) aoChamar(resultado.reservaId, alternativaBloqueada)
      } else if (document.activeElement === botao) {
        botao.closest("li")?.querySelector<HTMLElement>(".situacao")?.focus()
      }
      atualizar()
    } catch {
      conversa?.cancelar()
      if (acao === "chamar") aoChamar()
      setErro(acao === "chamar" ? avisoChamada : mensagens.indisponivel)
      atualizar()
    } finally {
      emAndamento.current = false
      setPendente(false)
    }
  }

  return <div className="acoes-pedido" role="group" aria-label="Ações do pedido" aria-busy={pendente}>
    {situacao === "Para analisar" && <>
      <Button variant="outline" type="button" aria-disabled={pendente} onClick={e => void agir("conversar", e.currentTarget)}>Conversar no WhatsApp</Button>
      <Button type="button" aria-disabled={pendente} onClick={e => void agir("aprovar", e.currentTarget)}>Aprovar</Button>
      <Button variant="ghost" type="button" aria-disabled={pendente} onClick={e => void agir("encerrar", e.currentTarget)}>Encerrar pedido</Button>
    </>}
    {situacao === "Aguardando vaga" &&
      <Button type="button" aria-disabled={pendente} onClick={e => void agir("chamar", e.currentTarget)}>Chamar</Button>}
    {situacao === "Chamada iniciada" && <>
      <Button type="button" aria-disabled={pendente} onClick={e => void agir("confirmar_envio", e.currentTarget)}>Confirmar envio</Button>
      <Button variant="outline" type="button" aria-disabled={pendente} onClick={e => void agir("reabrir", e.currentTarget)}>Reabrir conversa</Button>
      <Button variant="ghost" type="button" aria-disabled={pendente} onClick={e => void agir("desfazer", e.currentTarget)}>Desfazer chamada</Button>
    </>}
    {(situacao === "Convite enviado" || situacao === "A conferir") && <>
      <Button type="button" aria-disabled={pendente} onClick={e => void agir("confirmar_entrada", e.currentTarget)}>Confirmar entrada</Button>
      <Button variant="outline" type="button" aria-disabled={pendente} onClick={e => void agir("desistir", e.currentTarget)}>Registrar desistência</Button>
      {situacao === "A conferir" && <Button variant="ghost" type="button" aria-disabled={pendente} onClick={e => void agir("encerrar_sem_aceite", e.currentTarget)}>Encerrar sem aceite</Button>}
    </>}
    {erro && <p className="aviso-acao" role="alert">{erro}</p>}
    {alternativa && (alternativa.reservaId ? situacao === "Chamada iniciada" && alternativa.reservaId === reservaId : situacao === "Para analisar") && <p className="aviso-acao">
      A conversa não abriu automaticamente. <a href={alternativa.url} target={alternativa.url.startsWith("https://wa.me/") ? "_blank" : "_self"} rel="noopener noreferrer" onClick={evento => {
        if (!evento.ctrlKey && !evento.metaKey && !evento.shiftKey && !evento.altKey && prepararAba().abrir(alternativa.url)) evento.preventDefault()
      }}>Abrir a conversa</a>
    </p>}
  </div>
}
