import { ArrowRight, KeyRound } from "lucide-react"
import { EntradaLayout } from "@/components/comunidade"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { entrar } from "./actions"

export const metadata = { title: "Entrar · Meet Up Tech SP" }

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams
  return <EntradaLayout equipe>
    <section className="formulario-area">
      <div className="secao-simbolo"><KeyRound aria-hidden="true" size={23} /></div>
      <h1>Acesso da equipe</h1>
      <p className="introducao">Entre com sua conta para consultar os pedidos de entrada na comunidade.</p>
      <form action={entrar} className="formulario">
        <div className="campo">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="seu@email.com" autoComplete="username" required />
        </div>
        <div className="campo">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>
        {erro && <p className="aviso-erro" role="alert">Não foi possível entrar. Confira seu e-mail e sua senha.</p>}
        <Button type="submit" className="acao-principal">Entrar <ArrowRight aria-hidden="true" /></Button>
      </form>
    </section>
  </EntradaLayout>
}
