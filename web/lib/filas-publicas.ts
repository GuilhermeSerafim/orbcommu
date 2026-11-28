import fotoDoEncontro from "../public/meetup.jpg"

const descricaoFoto = "Participantes do Meet Up Tech SP reunidos no Microsoft Reactor São Paulo"

export const meetUpTechSP = {
  slug: "meet-up-tech-sp",
  titulo: "Pedir entrada na Meet Up Tech SP",
  destino: "na Meet Up Tech SP",
  imagemDePrevia: { caminho: "/compartilhar/meet-up-tech-sp.jpg", alt: descricaoFoto },
  cartaz: {
    categoria: "Comunidade de tecnologia",
    linhas: ["Meet Up", "Tech SP"],
    local: "São Paulo, SP",
    foto: fotoDoEncontro,
    descricaoFoto,
  },
}

export type FilaPublica = typeof meetUpTechSP

export const filasPublicas: FilaPublica[] = [meetUpTechSP]

export function buscarFilaPublica(slug: string) {
  return filasPublicas.find(fila => fila.slug === slug)
}

export function linkDeParticipacao(fila: FilaPublica) {
  return `/participar/${fila.slug}`
}
