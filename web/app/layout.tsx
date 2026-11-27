import type { ReactNode } from "react"

export const metadata = { title: "Pedir entrada · Meet Up Tech SP" }

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
