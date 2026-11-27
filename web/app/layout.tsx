import type { ReactNode } from "react"
import "@fontsource-variable/bricolage-grotesque"
import "@fontsource-variable/instrument-sans"
import "./globals.css"

export const metadata = { title: "OrbCommu" }

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR" data-scroll-behavior="smooth"><body>{children}</body></html>
}
