import { ArrowLeft, ArrowUpRight, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { SimboloOrbCommu } from "@/components/marca-orbcommu"
import fotoDoEncontro from "../public/meetup.jpg"

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

export function EntradaLayout({ children, equipe = false }: { children: ReactNode; equipe?: boolean }) {
  return <>
    <Cabecalho>
      <Button asChild variant="ghost" className="header-action">
        {equipe
          ? <Link href="/"><ArrowLeft aria-hidden="true" /> Voltar à comunidade</Link>
          : <Link href="/entrar">Acesso da equipe <ArrowUpRight aria-hidden="true" /></Link>}
      </Button>
    </Cabecalho>
    <main className={equipe ? "entrada-layout entrada-equipe" : "entrada-layout"}>
      <aside className="cartaz" aria-label="Meet Up Tech SP, comunidade de tecnologia em São Paulo">
        <div className="cartaz-titulo" aria-hidden="true">
          <span className="cartaz-categoria">Comunidade de tecnologia</span>
          <span className="nome-comunidade">Meet Up<br />Tech SP<span className="ponto">.</span></span>
        </div>
        <div className="cartaz-foto">
          <Image src={fotoDoEncontro} alt="Participantes do Meet Up Tech SP reunidos no Microsoft Reactor São Paulo"
            fill sizes="(max-width: 660px) 46vw, (max-width: 780px) 300px, (max-width: 1280px) 46vw, 580px" />
        </div>
        <div className="cartaz-legenda">
          <span><MapPin aria-hidden="true" size={15} /> São Paulo, SP</span>
        </div>
      </aside>
      <div className="entrada-conteudo">{children}</div>
    </main>
  </>
}
