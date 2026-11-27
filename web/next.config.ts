import type { NextConfig } from "next"

const config: NextConfig = {
  redirects: () => Promise.resolve([{ source: "/organizadores", destination: "/", permanent: true }]),
}

export default config
