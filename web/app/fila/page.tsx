import { LogOut, LockKeyhole } from "lucide-react"
import { redirect } from "next/navigation"
import { Cabecalho } from "@/components/cabecalho"
import { NavegacaoEquipe } from "@/components/navegacao-equipe"
import { Button } from "@/components/ui/button"
import { obterAcesso } from "../../lib/acesso"
import { situacoesFila } from "../../lib/fila"
import { sair } from "../entrar/actions"
import { consultarConvite } from "../../lib/configuracao-convite"
import LinkDoGrupo from "./link-do-grupo"
import Listagem from "./listagem"
import "./fila.css"

export const metadata = { title: "Área da equipe · Meet Up Tech SP" }

export default async function Fila({ searchParams }: { searchParams: Promise<{ pedido?: string | string[] }> }) {
  if ((await searchParams).pedido !== undefined) redirect("/fila")
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  return <>
    <Cabecalho>
      <form action={sair}><Button variant="ghost" className="header-action" type="submit"><LogOut aria-hidden="true" /> Sair</Button></form>
    </Cabecalho>
    <main className="painel">
      {acesso.tipo === "sem_vinculo"
        ? <section className="painel-recusado"><div className="secao-simbolo"><LockKeyhole aria-hidden="true" /></div>
            <h1>Acesso recusado</h1><p>Esta conta não tem acesso à fila desta comunidade.</p></section>
        : <>
            <NavegacaoEquipe atual="fila" />
            <header className="painel-titulo">
              <span className="comunidade-id">Meet Up Tech SP</span>
              <h1>Fila de entrada</h1>
            </header>
            {acesso.perfil === "operacao" && <LinkDoGrupo convite={await consultarConvite(acesso)} />}
            <Listagem key={acesso.usuarioId} podeOperar={acesso.perfil === "operacao"} situacoes={situacoesFila} />
          </>}
    </main>
  </>
}
