import type { Metadata } from "next"

const site = "https://orbcommu.vercel.app"
const marca = { caminho: "/compartilhar/orbcommu.jpg", alt: "OrbCommu — Inscrições e filas de espera" }

type Previa = {
  titulo: string
  descricao: string
  caminho: string
  imagem?: typeof marca
}

export function metadadosDeCompartilhamento({ titulo, descricao, caminho, imagem = marca }: Previa): Metadata {
  const url = new URL(caminho, site)
  const foto = { url: new URL(imagem.caminho, site), alt: imagem.alt, width: 1200, height: 630, type: "image/jpeg" }
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: url },
    openGraph: {
      type: "website", locale: "pt_BR", siteName: "OrbCommu",
      title: titulo, description: descricao, url, images: [foto],
    },
    twitter: { card: "summary_large_image", title: titulo, description: descricao, images: [foto] },
  }
}
