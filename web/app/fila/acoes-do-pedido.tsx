"use client"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { AcaoPedido, ResultadoAcao } from "../../lib/operacao"
import { agirNoPedido } from "./acoes"

const mensagens = {
  acesso: "Esta sessão não tem permissão para alterar pedidos.",
  acao_invalida: "Não foi possível identificar a ação deste pedido.",
  pedido_alterado: "Este pedido mudou. Confira a situação atualizada.",
  indisponivel: "Não foi possível concluir a ação. Tente novamente.",
} satisfies Record<Extract<ResultadoAcao, { ok: false }>["motivo"], string>

export function AcoesDoPedido({ id, atualizar }: { id: string; atualizar: () => void }) {
  const emAndamento = useRef(false)
  const [pendente, setPendente] = useState(false)
  const [erro, setErro] = useState<string>()
  const [urlAlternativa, setUrlAlternativa] = useState<string>()

  async function agir(acao: AcaoPedido, botao: HTMLButtonElement) {
    if (emAndamento.current) return
    emAndamento.current = true
    botao.focus()
    const conversa = acao === "conversar" ? window.open("about:blank", "_blank") : null
    if (conversa) conversa.opener = null
    setPendente(true)
    setErro(undefined)
    setUrlAlternativa(undefined)

    try {
      const resultado = await agirNoPedido(id, acao)
      if (!resultado.ok) {
        conversa?.close()
        setErro(mensagens[resultado.motivo])
        if (resultado.motivo === "pedido_alterado" || resultado.motivo === "acesso") atualizar()
        return
      }
      if (resultado.urlWhatsApp) {
        try {
          if (conversa && !conversa.closed) conversa.location.replace(resultado.urlWhatsApp)
          else setUrlAlternativa(resultado.urlWhatsApp)
        } catch {
          conversa?.close()
          setUrlAlternativa(resultado.urlWhatsApp)
        }
      } else if (document.activeElement === botao) {
        botao.closest("li")?.querySelector<HTMLElement>(".situacao")?.focus()
      }
      atualizar()
    } catch {
      conversa?.close()
      setErro(mensagens.indisponivel)
    } finally {
      emAndamento.current = false
      setPendente(false)
    }
  }

  return <div className="acoes-pedido" role="group" aria-label="Ações do pedido" aria-busy={pendente}>
    <Button variant="outline" type="button" aria-disabled={pendente} onClick={e => void agir("conversar", e.currentTarget)}>Conversar no WhatsApp</Button>
    <Button type="button" aria-disabled={pendente} onClick={e => void agir("aprovar", e.currentTarget)}>Aprovar</Button>
    <Button variant="ghost" type="button" aria-disabled={pendente} onClick={e => void agir("encerrar", e.currentTarget)}>Encerrar pedido</Button>
    {erro && <p className="aviso-acao" role="alert">{erro}</p>}
    {urlAlternativa && <p className="aviso-acao">
      A abertura automática foi bloqueada. <a href={urlAlternativa} target="_blank" rel="noopener noreferrer">Abrir a conversa</a>
    </p>}
  </div>
}
