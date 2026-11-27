"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { AcaoPedido, ResultadoAcao } from "../../lib/operacao"
import { agirNoPedido } from "./acoes"

const mensagens = {
  sem_convite: "Configure o link do grupo para chamar esta pessoa.",
  acesso: "Esta sessão não tem permissão para alterar pedidos.",
  acao_invalida: "Não foi possível identificar a ação deste pedido.",
  pedido_alterado: "Este pedido mudou. Confira a situação atualizada.",
  indisponivel: "Não foi possível concluir a ação. Tente novamente.",
} satisfies Record<Extract<ResultadoAcao, { ok: false }>["motivo"], string>

export function AcoesDoPedido({ id, situacao, reservaId, atualizar }: { id: string; situacao: string; reservaId: string | null; atualizar: () => void }) {
  const emAndamento = useRef(false)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string>()
  const [alternativa, setAlternativa] = useState<{ url: string; reservaId?: string }>()
  const [semConvite, setSemConvite] = useState(false)

  async function agir(acao: AcaoPedido, botao: HTMLButtonElement) {
    if (emAndamento.current) return
    emAndamento.current = true
    botao.focus()
    const conversa = ["conversar", "chamar", "reabrir"].includes(acao) ? window.open("about:blank", "_blank") : null
    if (conversa) conversa.opener = null
    setPendente(true)
    setErro(undefined)
    setAlternativa(undefined)
    setSemConvite(false)

    try {
      const resultado = await agirNoPedido(id, acao, reservaId ?? undefined)
      if (!resultado.ok) {
        conversa?.close()
        setErro(mensagens[resultado.motivo])
        setSemConvite(resultado.motivo === "sem_convite")
        if (resultado.motivo === "pedido_alterado" || resultado.motivo === "acesso") atualizar()
        return
      }
      if (resultado.urlWhatsApp) {
        try {
          if (conversa && !conversa.closed) conversa.location.replace(resultado.urlWhatsApp)
          else setAlternativa({ url: resultado.urlWhatsApp, reservaId: resultado.reservaId })
        } catch {
          conversa?.close()
          setAlternativa({ url: resultado.urlWhatsApp, reservaId: resultado.reservaId })
        }
      } else if (document.activeElement === botao) {
        botao.closest("li")?.querySelector<HTMLElement>(".situacao")?.focus()
      }
      atualizar()
    } catch {
      conversa?.close()
      setErro(mensagens.indisponivel)
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
    {semConvite && <Button type="button" variant="outline" onClick={() => {
      const campo = document.getElementById("convite-do-grupo")
      const detalhes = campo?.closest("details")
      if (detalhes) detalhes.open = true
      campo?.focus()
    }}>Configurar link do grupo</Button>}
    {erro && <p className="aviso-acao" role="alert">{erro}</p>}
    {alternativa && (alternativa.reservaId ? alternativa.reservaId === reservaId : situacao === "Para analisar") && <p className="aviso-acao">
      A abertura automática foi bloqueada. <a href={alternativa.url} target="_blank" rel="noopener noreferrer">Abrir a conversa</a>
    </p>}
  </div>
}
