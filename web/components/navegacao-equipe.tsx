import Link from "next/link"

export function NavegacaoEquipe({ atual, superadmin }: Readonly<{ atual: "fila" | "divulgacoes" | "equipe"; superadmin?: boolean }>) {
  return <nav aria-label="Área da comunidade" className="nav-equipe">
    <Link href="/fila" aria-current={atual === "fila" ? "page" : undefined}>Fila de entrada</Link>
    <Link href="/fila/divulgacoes" aria-current={atual === "divulgacoes" ? "page" : undefined}>Divulgações</Link>
    {superadmin && <Link href="/fila/equipe" aria-current={atual === "equipe" ? "page" : undefined}>Equipe</Link>}
  </nav>
}
