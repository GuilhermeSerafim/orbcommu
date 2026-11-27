import Link from "next/link"

export function NavegacaoEquipe({ atual }: Readonly<{ atual: "fila" | "divulgacoes" }>) {
  return <nav aria-label="Área da comunidade" className="nav-equipe">
    <Link href="/fila" aria-current={atual === "fila" ? "page" : undefined}>Fila de entrada</Link>
    <Link href="/fila/divulgacoes" aria-current={atual === "divulgacoes" ? "page" : undefined}>Divulgações</Link>
  </nav>
}
