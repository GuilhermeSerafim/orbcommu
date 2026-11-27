import { randomUUID } from "node:crypto"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { hojeEmSaoPaulo } from "@/lib/periodo-divulgacao"
import { acessoDivulgacoes } from "../acesso"
import CriarDivulgacao from "./formulario"

export default async function Nova() {
  const acesso = await acessoDivulgacoes()
  if (acesso.perfil !== "operacao") redirect("/fila/divulgacoes")
  return <>
    <Link className="voltar-edicoes" href="/fila/divulgacoes"><ArrowLeft size={16} />Divulgações</Link>
    <header className="titulo-divulgacao"><h1>Nova divulgação</h1></header>
    <CriarDivulgacao id={randomUUID()} hoje={hojeEmSaoPaulo()} />
  </>
}
