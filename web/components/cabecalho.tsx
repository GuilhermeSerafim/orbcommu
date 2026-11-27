import Link from "next/link"
import type { ReactNode } from "react"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"

export function Cabecalho({ children }: Readonly<{ children?: ReactNode }>) {
  return <header className="masthead">
    <div className="masthead-inner">
      <Link href="/" className="marca" aria-label="OrbCommu, página inicial">
        <SimboloOrbCommu />
        OrbCommu
      </Link>
      {children}
    </div>
  </header>
}
