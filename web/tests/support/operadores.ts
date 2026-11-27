import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { parseEnv } from "node:util"
import { createClient } from "@supabase/supabase-js"
import type { Page } from "@playwright/test"
import { banco } from "./banco"

function ambiente(arquivo: string) {
  return parseEnv(readFileSync(new URL(arquivo, import.meta.url), "utf8"))
}

export async function criarOperadores() {
  const url = ambiente("../../.env.local").NEXT_PUBLIC_SUPABASE_URL
  if (url !== "http://127.0.0.1:55421") throw new Error("A fixture exige o Auth local.")
  const chave = ambiente("../.env.fixture").SUPABASE_SERVICE_ROLE_KEY
  if (!chave) throw new Error("Execute local:prepare para preparar o Auth local.")
  const { auth } = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids: string[] = []
  async function limpar() {
    for (const id of ids) {
      const { error } = await auth.admin.deleteUser(id)
      if (error) throw error
    }
  }
  async function criar(perfil?: "operacao" | "leitura") {
    const email = `piloto-${randomUUID()}@example.test`
    const senha = randomUUID()
    const { data, error } = await auth.admin.createUser({ email, password: senha, email_confirm: true })
    if (error) throw error
    ids.push(data.user.id)
    if (perfil) await banco.query(
      "insert into orbcommu.operadores (comunidade, usuario_id, perfil) values ($1, $2, $3)",
      ["meet-up-tech-sp", data.user.id, perfil],
    )
    return { email, senha, id: data.user.id }
  }
  try {
    return {
      primeira: await criar("operacao"),
      segunda: await criar("operacao"),
      leitora: await criar("leitura"),
      semVinculo: await criar(),
      limpar,
    }
  } catch (erro) {
    await limpar()
    throw erro
  }
}

export async function fazerLogin(page: Page, conta: { email: string; senha: string }) {
  await page.goto("/entrar")
  await page.getByLabel("E-mail").fill(conta.email)
  await page.getByLabel("Senha").fill(conta.senha)
  await page.getByRole("button", { name: "Entrar" }).click()
}
