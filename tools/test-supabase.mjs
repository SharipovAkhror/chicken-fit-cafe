import { createClient } from '@supabase/supabase-js'

const url = 'https://ikvontqurgzopdmsdmla.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrdm9udHF1cmd6b3BkbXNkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzgzNzIsImV4cCI6MjEwMjI1NDM3Mn0.URw3FfSKNXm1LdXtf6rCUQL-EITRObj-zd5oJmQFqq0'

const supabase = createClient(url, key)

async function test() {
  console.log('Testing Supabase connection...')
  const { data, error } = await supabase.from('categories').select('*')
  if (error) {
    console.log('Categories query error (tables might need SQL execution):', error.message)
  } else {
    console.log('Categories found in database:', data?.length)
  }
}

test()
