import { expect, it } from "vitest"
import { normalizarConvite } from "../../lib/convite"

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
