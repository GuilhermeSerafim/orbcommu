import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { obterDivulgacao, resultadoDivulgacao } from "@/lib/divulgacoes"
import { mostrarDia } from "@/lib/periodo-divulgacao"
import { acessoDivulgacoes } from "../acesso"
import { Material, Encerramento } from "./material"
import Resultados from "./resultados"

export default async function Edicao({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const acesso = await acessoDivulgacoes()
  const { id } = await params
  const edicao = await obterDivulgacao(acesso.comunidade, id)
  if (!edicao) notFound()
  const resultado = await resultadoDivulgacao(acesso.comunidade, id)
  return <>
    <Link className="voltar-edicoes" href="/fila/divulgacoes"><ArrowLeft size={16} />Todas as divulgações</Link>
    <header className="titulo-divulgacao"><div><span className={`estado-edicao ${edicao.estado}`}>{edicao.estado}</span>
      <h1>{edicao.nome}</h1><p className="periodo-edicao">{mostrarDia(edicao.inicio)} — {mostrarDia(edicao.fim)} · São Paulo</p></div></header>
    {edicao.estado !== "Encerrada" && <Material caminho={`/participar/${acesso.comunidade}/${id}`} id={id} />}
    <Resultados dados={resultado} />
    {acesso.perfil === "operacao" && edicao.estado !== "Encerrada" && <Encerramento id={id} />}
  </>
}
