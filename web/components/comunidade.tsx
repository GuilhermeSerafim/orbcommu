import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import { linkDeParticipacao, meetUpTechSP } from "@/lib/filas-publicas"

export function Cabecalho({ children }: { children: ReactNode }) {
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

export function EntradaLayout({ children, fila = meetUpTechSP, equipe = false }: { children: ReactNode; fila?: typeof meetUpTechSP; equipe?: boolean }) {
  const { cartaz } = fila
  return <>
    <Cabecalho>
      <Button asChild variant="ghost" className="header-action">
        {equipe
          ? <Link href={linkDeParticipacao(fila)}><ArrowLeft aria-hidden="true" /> Voltar à comunidade</Link>
          : <Link href="/entrar">Acesso da equipe <ArrowUpRight aria-hidden="true" /></Link>}
      </Button>
    </Cabecalho>
    <main className={equipe ? "entrada-layout entrada-equipe" : "entrada-layout"}>
      <aside className="cartaz" aria-label={`${cartaz.linhas.join(" ")}, ${cartaz.categoria}, ${cartaz.local}`}>
        <div className="cartaz-titulo" aria-hidden="true">
          <span className="cartaz-categoria">{cartaz.categoria}</span>
          <span className="nome-comunidade">{cartaz.linhas.map((linha, indice) =>
            <span key={linha}>{indice > 0 && <br />}{linha}</span>
          )}<span className="ponto">.</span></span>
        </div>
        <div className="cartaz-foto">
          <Image src={cartaz.foto} alt={cartaz.descricaoFoto}
            fill sizes="(max-width: 660px) 46vw, (max-width: 780px) 300px, (max-width: 1280px) 46vw, 580px" />
        </div>
        <div className="cartaz-legenda">
          <span><MapPin aria-hidden="true" size={15} /> {cartaz.local}</span>
        </div>
      </aside>
      <div className="entrada-conteudo">{children}</div>
    </main>
  </>
}
