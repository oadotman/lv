// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.ASSEMBLYAI_API_KEY = 'test-assemblyai-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.INNGEST_EVENT_KEY = 'test-inngest-event-key'
process.env.INNGEST_SIGNING_KEY = 'test-inngest-signing-key'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy1sb25n'
