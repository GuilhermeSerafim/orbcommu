import { redirect } from "next/navigation"
import { obterAcesso } from "../../lib/acesso"
import { sair } from "../entrar/actions"
import Listagem from "./listagem"
import "./fila.css"

export const metadata = { title: "Área da equipe · Meet Up Tech SP" }

export default async function Fila() {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  return <div className="fila">
    <header><div><strong>OrbCommu</strong><form action={sair}><button type="submit">Sair</button></form></div></header>
    <main>{acesso.tipo === "sem_vinculo"
      ? <><h1>Acesso recusado</h1><p>Esta conta não tem acesso à fila desta comunidade.</p></>
      : <><h1>Fila de entrada</h1><p>Meet Up Tech SP</p><Listagem key={acesso.usuarioId} /></>}</main>
  </div>
}
