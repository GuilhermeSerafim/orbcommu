import { LogOut, LockKeyhole } from "lucide-react"
import { redirect } from "next/navigation"
import { Cabecalho } from "@/components/comunidade"
import { Button } from "@/components/ui/button"
import { obterAcesso } from "../../lib/acesso"
import { sair } from "../entrar/actions"
import Listagem from "./listagem"
import "./fila.css"

export const metadata = { title: "Área da equipe · Meet Up Tech SP" }

export default async function Fila() {
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
            <header className="painel-titulo">
              <span className="comunidade-id">Meet Up Tech SP</span>
              <h1>Fila de entrada</h1>
            </header>
            <Listagem key={acesso.usuarioId} />
          </>}
    </main>
  </>
}
