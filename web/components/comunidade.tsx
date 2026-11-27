import { ArrowLeft, ArrowUpRight, MapPin, Orbit } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function Cabecalho({ children }: { children: ReactNode }) {
  return <header className="masthead">
    <div className="masthead-inner">
      <Link href="/" className="marca" aria-label="OrbCommu, página inicial">
        <span className="marca-simbolo"><Orbit aria-hidden="true" strokeWidth={2.05} /></span>
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
        <div className="cartaz-foto" aria-hidden="true">
          <div className="foto-ceu" /><div className="orbita" /><div className="orbita orbita-menor" />
        </div>
        <div className="cartaz-legenda">
          <span><MapPin aria-hidden="true" size={15} /> São Paulo, SP</span>
          <a href="https://unsplash.com/photos/76UA2V8ImaY" aria-label="Fotografia de São Paulo por Odair Faléco">Foto: Odair Faléco</a>
        </div>
      </aside>
      <div className="entrada-conteudo">{children}</div>
    </main>
  </>
}
