import next from 'eslint-config-next'

const config = [
  ...next,
  {
    rules: {
      // правила React Compiler: пока предупреждения (старое гостевое меню и синхронизация состояния с IndexedDB)
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'supabase/**', 'next-env.d.ts'] },
]
export default config
