import {
  Circle, CircleCheck, ClipboardList, ClipboardX, Clock3, MailCheck,
  ScanEye, Send, TimerOff, UserRoundMinus, type LucideIcon,
} from "lucide-react"

type Tom = "atencao" | "andamento" | "confirmada" | "neutro"

const selos = new Map<string, [LucideIcon, Tom]>([
  ["Para analisar", [ClipboardList, "atencao"]],
  ["Aguardando vaga", [Clock3, "andamento"]],
  ["Chamada iniciada", [Send, "andamento"]],
  ["Convite enviado", [MailCheck, "andamento"]],
  ["A conferir", [ScanEye, "atencao"]],
  ["Entrada confirmada", [CircleCheck, "confirmada"]],
  ["Prazo encerrado", [TimerOff, "neutro"]],
  ["Desistiu", [UserRoundMinus, "neutro"]],
  ["Encerrado na vistoria", [ClipboardX, "neutro"]],
])

export function SeloSituacao({ situacao }: { situacao: string }) {
  const [Icone, tom] = selos.get(situacao) ?? [Circle, "neutro"]
  return <span className="situacao" data-tom={tom} tabIndex={-1}>
    <Icone size={16} aria-hidden="true" /><span>{situacao}</span>
  </span>
}
