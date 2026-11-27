import type { NextConfig } from "next"

const config: NextConfig = {
  async redirects() {
    return [{ source: "/organizadores", destination: "/", permanent: true }]
  },
}

export default config
