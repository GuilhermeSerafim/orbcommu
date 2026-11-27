import { MapPin } from "lucide-react"
import Image from "next/image"
import type { ReactNode } from "react"
import { Cabecalho } from "@/components/cabecalho"
import type { FilaPublica } from "@/lib/filas-publicas"

export function EntradaLayout({ children, fila }: Readonly<{ children: ReactNode; fila: FilaPublica }>) {
  const { cartaz } = fila
  return <>
    <Cabecalho />
    <main className="entrada-layout">
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
