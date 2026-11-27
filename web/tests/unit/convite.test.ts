import { expect, it } from "vitest"
import { conversaDeConvite, destinoDaConversa, normalizarConvite } from "../../lib/convite"

const desktop = { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", maxTouchPoints: 0 }

it("abre o aplicativo instalado no computador e mantém a mensagem intacta", () => {
  const link = conversaDeConvite("12025550142", "https://chat.whatsapp.com/FixtureAb123")
  const direto = new URL(destinoDaConversa(link, desktop))
  expect(direto.protocol).toBe("whatsapp:")
  expect(direto.hostname).toBe("send")
  expect(direto.searchParams.get("phone")).toBe("12025550142")
  expect(direto.searchParams.get("text")).toBe(new URL(link).searchParams.get("text"))
  expect(destinoDaConversa("https://wa.me/12025550142", desktop)).toBe("whatsapp://send?phone=12025550142")
})

it.each(["Android", "iPhone", "Macintosh"])("preserva o link universal em %s com tela de toque", dispositivo => {
  const link = conversaDeConvite("12025550142", "https://chat.whatsapp.com/FixtureAb123")
  expect(destinoDaConversa(link, { userAgent: dispositivo, maxTouchPoints: 5 })).toBe(link)
})

it("abre a conversa da pessoa com a mensagem e o convite em uma única linha", () => {
  const link = conversaDeConvite("5511900000101", "https://chat.whatsapp.com/FixtureAb123")
  expect(link).toBe(
    "https://wa.me/5511900000101?text=Chegou%20a%20sua%20vez!" +
    "%20Solicite%20entrada%20no%20grupo%20pelo%20WhatsApp%20em%20at%C3%A9%2024%20horas" +
    "%20usando%20este%20convite%3A%20https%3A%2F%2Fchat.whatsapp.com%2FFixtureAb123" +
    "%20Se%20voc%C3%AA%20n%C3%A3o%20solicitar%20dentro%20do%20prazo%2C%20perde%20a%20vez.",
  )
})

it.each([
  "https://chat.whatsapp.com/FixtureAb123",
  " https://chat.whatsapp.com/FixtureAb123?mode=ac_t#share ",
])("preserva o código de %s", (valor) => {
  expect(normalizarConvite(valor)).toBe("https://chat.whatsapp.com/FixtureAb123")
})

it.each([
  "https://orbcommu.example/entrada",
  "https://chat.whatsapp.com.example/FixtureAb123",
  "https://usuario:senha@chat.whatsapp.com/FixtureAb123",
  "https://@chat.whatsapp.com/FixtureAb123",
  "http://chat.whatsapp.com/FixtureAb123",
  "https://chat.whatsapp.com:444/FixtureAb123",
  "https://chat.whatsapp.com/",
  "https://chat.whatsapp.com/primeiro/segundo",
  "https://chat.whatsapp.com/primeiro/../segundo",
])("rejeita %s", (valor) => {
  expect(normalizarConvite(valor)).toBeNull()
})
