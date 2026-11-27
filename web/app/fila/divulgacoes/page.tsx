import Link from "next/link"
import { ArrowUpRight, Plus, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { listarDivulgacoes } from "@/lib/divulgacoes"
import { mostrarDia } from "@/lib/periodo-divulgacao"
import { acessoDivulgacoes } from "./acesso"

export default async function Divulgacoes() {
  const acesso = await acessoDivulgacoes()
  const edicoes = await listarDivulgacoes(acesso.comunidade)
  const podeCriar = acesso.perfil === "operacao"
  return <>
    <header className="titulo-divulgacao"><div><span className="comunidade-id">Meet Up Tech SP</span><h1>Divulgações</h1></div>
      {podeCriar && <Button asChild><Link href="/fila/divulgacoes/nova"><Plus />Nova divulgação</Link></Button>}
    </header>
    {edicoes.length ? <ul className="edicoes">{edicoes.map(d => <li key={d.id}><Link href={`/fila/divulgacoes/${d.id}`}>
      <div><span className={`estado-edicao ${d.estado}`}>{d.estado}</span><h2>{d.nome}</h2>
        <span className="periodo-edicao">{mostrarDia(d.inicio)} — {mostrarDia(d.fim)}</span></div>
      <span className="resumo-linha">{d.solicitantes} {d.solicitantes === 1 ? "solicitante" : "solicitantes"} <ArrowUpRight size={18} /></span>
    </Link></li>)}</ul> : <div className="vazio-divulgacao"><QrCode size={40} /><h2>Nenhuma divulgação criada</h2>
      <p>{podeCriar ? "Crie uma divulgação para compartilhar o QR do evento." : "As divulgações da comunidade aparecerão aqui."}</p></div>}
  </>
}
