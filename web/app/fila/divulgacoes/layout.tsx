import type { ReactNode } from "react"
import { LogOut } from "lucide-react"
import { Cabecalho } from "@/components/cabecalho"
import { Button } from "@/components/ui/button"
import { NavegacaoEquipe } from "@/components/navegacao-equipe"
import { sair } from "../../entrar/actions"
import { acessoDivulgacoes } from "./acesso"
import "../fila.css"
import "./divulgacoes.css"

export const metadata = { title: "Divulgações · OrbCommu" }

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const acesso = await acessoDivulgacoes()
  return <>
    <Cabecalho><form action={sair}><Button variant="ghost" className="header-action"><LogOut /> Sair</Button></form></Cabecalho>
    <main className="painel divulgacoes"><NavegacaoEquipe atual="divulgacoes" superadmin={acesso.superadmin} />{children}</main>
  </>
}
