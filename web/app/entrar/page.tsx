import "../participante.css"
import { entrar } from "./actions"

export const metadata = { title: "Entrar · Meet Up Tech SP" }

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return <main className="participante">
    <header>Meet Up Tech SP</header>
    <h1>Acesso da equipe</h1>
    <form action={entrar}>
      <div><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div><label htmlFor="senha">Senha</label><input id="senha" name="senha" type="password" autoComplete="current-password" required /></div>
      {erro && <p role="alert">Não foi possível entrar. Confira seu e-mail e sua senha.</p>}
      <button type="submit">Entrar</button>
    </form>
  </main>
}
