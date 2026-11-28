"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { redefinir } from "./acoes"

export default function Redefinicao({ id, email }: { id: string; email: string }) {
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState<{ senha: string } | { erro: string }>()
  async function gerar() {
    setOcupado(true)
    try { setResultado(await redefinir(id)) }
    catch { setResultado({ erro: "A conexão foi interrompida. Confira o acesso antes de tentar novamente." }) }
    finally { setOcupado(false); setConfirmar(false) }
  }
  return <div className="campo">
    {resultado && ("senha" in resultado
      ? <div role="status"><p>Copie a senha temporária de {email}.</p><code>{resultado.senha}</code>{" "}
          <Button variant="ghost" onClick={() => setResultado(undefined)}>Ocultar</Button></div>
      : <p role="alert">{resultado.erro}</p>)}
    {confirmar ? <div><p>Redefinir a senha de {email} encerra o acesso atual ao painel.</p>
      <Button disabled={ocupado} onClick={gerar}>Gerar senha temporária</Button>{" "}
      <Button disabled={ocupado} variant="ghost" onClick={() => setConfirmar(false)}>Cancelar</Button></div>
      : (!resultado || "erro" in resultado) && <Button variant="outline" onClick={() => setConfirmar(true)}>Redefinir senha</Button>}
  </div>
}
