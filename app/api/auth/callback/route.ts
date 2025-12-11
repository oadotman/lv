import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth callback error:', error)
        // Redirect to error page or login with error message
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
      }

      // Successfully authenticated, redirect to the requested page
      return NextResponse.redirect(`${origin}${next}`)
    } catch (error) {
      console.error('Unexpected auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`)
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}

export async function POST(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  try {
    const formData = await request.formData()
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return NextResponse.redirect(`${origin}/login?error=Email%20and%20password%20required`)
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Auth signin error:', error)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (error) {
    console.error('Unexpected signin error:', error)
    return NextResponse.redirect(`${origin}/login?error=Authentication%20failed`)
  }
}