import next from 'eslint-config-next'

const config = [
  ...next,
  {
    files: ['features/**', 'components/**'],
    rules: {
      // фото — локальные webp-миниатюры, кэшируются офлайн; оптимизатор next/image кассе не нужен
      '@next/next/no-img-element': 'off',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'supabase/**', 'next-env.d.ts'] },
]
export default config
