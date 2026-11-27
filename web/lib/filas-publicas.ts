import fotoDoEncontro from "../public/meetup.jpg"

export const meetUpTechSP = {
  slug: "meet-up-tech-sp",
  titulo: "Pedir entrada na Meet Up Tech SP",
  destino: "na Meet Up Tech SP",
  cartaz: {
    categoria: "Comunidade de tecnologia",
    linhas: ["Meet Up", "Tech SP"],
    local: "São Paulo, SP",
    foto: fotoDoEncontro,
    descricaoFoto: "Participantes do Meet Up Tech SP reunidos no Microsoft Reactor São Paulo",
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
