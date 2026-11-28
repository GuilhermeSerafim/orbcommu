import { redirect } from "next/navigation"
import { Cabecalho } from "@/components/cabecalho"
import { NavegacaoEquipe } from "@/components/navegacao-equipe"
import { Button } from "@/components/ui/button"
import { obterAcesso } from "@/lib/acesso"
import { listarEquipe } from "@/lib/equipe"
import { sair } from "../../entrar/actions"
import Redefinicao from "./redefinicao"
import "../fila.css"

export const metadata = { title: "Equipe · OrbCommu" }

export default async function Equipe() {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  if (acesso.tipo === "definir_senha") redirect("/entrar/definir-senha")
  if (acesso.tipo !== "operador" || !acesso.superadmin) redirect("/fila")
  const equipe = await listarEquipe(acesso)
  return <>
    <Cabecalho><form action={sair}><Button variant="ghost">Sair</Button></form></Cabecalho>
    <main className="painel">
      <NavegacaoEquipe atual="equipe" superadmin />
      <header className="painel-titulo"><h1>Acessos da equipe</h1></header>
      <div className="formulario">{equipe.map(pessoa => <section className="campo" key={pessoa.id} aria-label={pessoa.email}>
        <strong>{pessoa.email}</strong>
        {pessoa.superadmin && <span>Superadmin</span>}
        <Redefinicao id={pessoa.id} email={pessoa.email} />
      </section>)}</div>
    </main>
  </>
}
