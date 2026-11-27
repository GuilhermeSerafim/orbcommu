export const entradasNovembro = [1, 2, 4, 7, 8, 10, 12]

export const edicoes = {
  nov: {
    nome: "Encontro de novembro",
    periodo: "16 a 22 de novembro",
    primeiroDia: 16,
    dias: [4, 6, 10, 16, 21, 15, 8],
    origens: [32, 25, 20, 3],
    pedidos: 20,
    entradas: entradasNovembro[entradasNovembro.length - 1],
  },
  out: {
    nome: "Encontro de outubro",
    periodo: "19 a 25 de outubro",
    primeiroDia: 19,
    dias: [3, 8, 12, 9, 15, 12, 5],
    origens: [24, 20, 16, 4],
    pedidos: 16,
    entradas: 8,
  },
}

export const origens = ["QR do encontro", "Link da comunidade", "Bio do evento", "Origem desconhecida"]
