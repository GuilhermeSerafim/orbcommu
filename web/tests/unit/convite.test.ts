import { expect, it } from "vitest"
import { conversaDeConvite, normalizarConvite } from "../../lib/convite"

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
