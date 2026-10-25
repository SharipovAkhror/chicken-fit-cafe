/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // id сборки в клиенте: баннер «Обновление готово» сравнивает его с /api/pos-notice
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
}

export default nextConfig
