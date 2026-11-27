import { redirect } from "next/navigation"
import { Cabecalho } from "@/components/cabecalho"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { obterAcesso } from "@/lib/acesso"
import { definirSenha, sair } from "../actions"

export const metadata = { title: "Definir senha · OrbCommu" }

const mensagens: Record<string, string> = {
  confirmacao: "As senhas precisam ser iguais.",
  repetida: "Escolha uma senha diferente da temporária.",
  tamanho: "Use ao menos 12 caracteres e até 72 bytes.",
  alteracao: "Não foi possível salvar a senha. Tente novamente.",
}

export default async function DefinirSenha({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const acesso = await obterAcesso()
  if (acesso.tipo === "anonimo") redirect("/entrar")
  if (acesso.tipo !== "definir_senha") redirect("/fila")
  const { erro } = await searchParams
  return <>
    <Cabecalho><form action={sair}><Button variant="ghost">Sair</Button></form></Cabecalho>
    <main className="login formulario-area">
      <h1>Defina sua senha</h1>
      <p>Escolha uma senha pessoal para acessar o painel.</p>
      <form action={definirSenha} className="formulario">
        <div className="campo"><Label htmlFor="senha">Nova senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={12} required aria-describedby="dica-senha" />
          <small id="dica-senha">Use pelo menos 12 caracteres.</small></div>
        <div className="campo"><Label htmlFor="confirmacao">Confirmar nova senha</Label>
          <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={12} required /></div>
        {erro && mensagens[erro] && <p className="aviso-erro" role="alert">{mensagens[erro]}</p>}
        <Button type="submit" className="acao-principal">Salvar senha e entrar</Button>
      </form>
    </main>
  </>
}
