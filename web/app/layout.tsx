import type { ReactNode } from "react"
import "@fontsource-variable/bricolage-grotesque"
import "@fontsource-variable/instrument-sans"
import "./globals.css"

export const metadata = { title: "Pedir entrada · Meet Up Tech SP" }

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
