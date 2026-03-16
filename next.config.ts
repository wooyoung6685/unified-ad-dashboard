import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  turbopack: {
    // /Users/choiwooyoung/package-lock.json 때문에 Turbopack이 잘못된 root를 잡는 것을 방지
    root: path.resolve(__dirname),
  },
}

export default nextConfig
