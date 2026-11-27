import { redirect } from "next/navigation"
import { obterAcesso } from "../../lib/acesso"
import { sair } from "../entrar/actions"
import "../participante.css"

export const metadata = { title: "Área da equipe · Meet Up Tech SP" }

export default async function Fila() {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  return <main className="participante">
    <header>Meet Up Tech SP</header>
    {acesso.tipo === "sem_vinculo"
      ? <><h1>Acesso recusado</h1><p>Esta conta não tem acesso à fila desta comunidade.</p></>
      : <h1>Fila de entrada</h1>}
    <form action={sair}><button type="submit">Sair</button></form>
  </main>
}
