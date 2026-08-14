import { createClient } from '@supabase/supabase-js'

const url = 'https://ikvontqurgzopdmsdmla.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrdm9udHF1cmd6b3BkbXNkbWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NzgzNzIsImV4cCI6MjEwMjI1NDM3Mn0.URw3FfSKNXm1LdXtf6rCUQL-EITRObj-zd5oJmQFqq0'

const supabase = createClient(url, key)

async function testOrder() {
  console.log('Testing order creation in Supabase...')
  const { data, error } = await supabase.from('orders').insert({
    order_number: '#001',
    order_type: 'dine_in',
    table_number: '3',
    items: [
      { id: 'strips-5', name: 'Стрипсы, 5 шт', price: 38000, qty: 2 },
      { id: 'fries', name: 'Картофель фри', price: 18000, qty: 1 }
    ],
    total_amount: 94000,
    payment_method: 'cash',
    cash_received: 100000,
    change_amount: 6000,
    status: 'completed',
  }).select()

  if (error) {
    console.error('Order creation error:', error.message)
  } else {
    console.log('Order created successfully! ID:', data[0]?.id)
  }
}

testOrder()
