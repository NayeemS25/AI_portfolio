import { supabase } from './supabase'
import { DatabaseUtils } from './database-utils'

export interface SignUpData {
  email: string
  password: string
  fullName: string
  mobileNumber?: string
  studentId?: string
  course?: string
  yearOfGraduation?: string
  collegeName?: string
  linkedinProfile?: string
  githubProfile?: string
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  static async signUp(userData: SignUpData) {
    try {
      console.log('🔵 Starting signup process for:', userData.email)
      
      // Test Supabase connection first
      try {
        const { error: testError } = await supabase.auth.getSession()
        console.log('🔵 Supabase connection test:', testError ? 'Failed' : 'Success')
        if (testError) {
          console.error('Connection test error:', testError)
        }
      } catch (connectionError) {
        console.error('🔴 Supabase connection failed:', connectionError)
        throw new Error('Unable to connect to authentication service. Please check your internet connection.')
      }

      // First, create the user with Supabase Auth
      console.log('🔵 Creating user with Supabase Auth...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          data: {
            full_name: userData.fullName,
            mobile_number: userData.mobileNumber,
            student_id: userData.studentId,
            course: userData.course,
            year_of_graduation: userData.yearOfGraduation,
            college_name: userData.collegeName,
            linkedin_profile: userData.linkedinProfile,
            github_profile: userData.githubProfile
          }
        }
      })

      console.log('🔵 Auth signup result:', { user: !!authData.user, error: authError })

      if (authError) {
        console.error('🔴 Auth signup error:', authError)
        
        // Handle specific Supabase errors
        if (authError.message?.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please try logging in instead.')
        }
        if (authError.message?.includes('Invalid email')) {
          throw new Error('Please enter a valid email address.')
        }
        if (authError.message?.includes('Password should be at least')) {
          throw new Error('Password should be at least 6 characters long.')
        }
        
        throw new Error(authError.message || 'Failed to create account')
      }

      if (!authData.user) {
        throw new Error('Failed to create user account')
      }

      console.log('🟢 User created successfully:', authData.user.id)

      // Wait for database trigger to create profile
      console.log('🔵 Waiting for database trigger to create profile...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Check if profile was created by the database trigger
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      console.log('🔵 Profile check result:', { 
        profileExists: !!existingProfile, 
        error: checkError?.code,
        message: checkError?.message 
      })

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('🔴 Error checking profile:', checkError)
        
        // If there's a database error (table doesn't exist)
        if (checkError.code === '42P01' || checkError.message?.includes('relation "public.user_profiles" does not exist')) {
          console.warn('⚠️  Database schema not deployed yet.')
          return {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account. Note: Database schema needs to be deployed for full functionality.',
            user: authData.user,
            needsSchemaSetup: true
          }
        }
      }

      if (!existingProfile) {
        console.log('🔵 Profile not created by trigger, creating manually...')
        
        // Test database table before attempting insert
        const dbTest = await DatabaseUtils.testUserProfilesTable();
        if (!dbTest.exists) {
          console.warn('⚠️ Database table test failed:', dbTest.error);
          return {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account. Note: Database schema needs to be deployed. Visit /database-setup for setup instructions.',
            user: authData.user,
            needsSchemaSetup: true,
            dbError: dbTest.error
          };
        }
        
        if (!dbTest.canInsert) {
          console.warn('⚠️ Database insert permissions failed:', dbTest.error);
          return {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account. Note: Database permissions need to be configured.',
            user: authData.user,
            needsSchemaSetup: true,
            dbError: dbTest.error
          };
        }
        
        // Create user profile manually if trigger failed
        const manualProfileData = {
          id: authData.user.id,
          email: userData.email,
          full_name: userData.fullName,
          mobile_number: userData.mobileNumber || null,
          student_id: userData.studentId || null,
          course: userData.course || null,
          year_of_graduation: userData.yearOfGraduation || null,
          college_name: userData.collegeName || null,
          linkedin_profile: userData.linkedinProfile || null,
          github_profile: userData.githubProfile || null
        }

        const { data: insertedProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert(manualProfileData)
          .select()
          .single()

        if (insertError) {
          console.error('🔴 Manual profile creation failed:')
          console.error('- Error object:', insertError)
          console.error('- Error code:', insertError.code)
          console.error('- Error message:', insertError.message)
          console.error('- Error details:', insertError.details)
          console.error('- Error hint:', insertError.hint)
          console.error('- Profile data attempted:', manualProfileData)
          
          // Check if it's a schema-related error
          if (insertError.code === '42P01' || insertError.message?.includes('relation "public.user_profiles" does not exist')) {
            console.warn('⚠️  Database table user_profiles does not exist.')
            return {
              success: true,
              message: 'Account created successfully! Please check your email to verify your account. Note: Database schema needs to be deployed for full functionality. Visit /database-setup for setup instructions.',
              user: authData.user,
              needsSchemaSetup: true
            }
          }
          
          return {
            success: true,
            message: 'Account created successfully! Please check your email to verify your account. You may need to complete your profile later.',
            user: authData.user,
            profileError: insertError.message
          }
        }

        console.log('🟢 Profile created manually:', insertedProfile)
      } else {
        console.log('🟢 Profile already exists from trigger:', existingProfile)
      }

      console.log('🟢 Signup completed successfully!')
      return {
        success: true,
        message: 'Account created successfully! Please check your email to verify your account.',
        user: authData.user
      }

    } catch (error) {
      console.error('🔴 Signup failed:', error)
      
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message
        }
      }
      
      return {
        success: false,
        message: 'An unexpected error occurred during signup. Please try again.'
      }
    }
  }

  static async signIn(credentials: { email: string; password: string }) {
    try {
      console.log('🔵 Starting signin process for:', credentials.email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        console.error('🔴 Signin error:', error)
        return {
          success: false,
          message: this.getAuthErrorMessage(error.message)
        }
      }

      // Verify user profile exists in database
      if (data.user) {
        console.log('🔵 Fetching user profile from database...')
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (profileError) {
          console.warn('⚠️  Profile fetch error:', profileError)
          
          // If profile doesn't exist, user can still sign in but may need to complete profile
          if (profileError.code === 'PGRST116') {
            console.log('🔵 User signed in but no profile found')
            return {
              success: true,
              message: 'Sign in successful! You may need to complete your profile.',
              user: data.user,
              session: data.session,
              needsProfileSetup: true
            }
          }
          
          if (profileError.code === '42P01') {
            console.warn('⚠️  Database schema not deployed')
            return {
              success: true,
              message: 'Sign in successful! Note: Database schema needs to be set up.',
              user: data.user,
              session: data.session,
              needsSchemaSetup: true
            }
          }
        }

        console.log('🟢 Signin successful with profile data')
        return {
          success: true,
          message: 'Welcome back!',
          user: data.user,
          session: data.session,
          profile: profile
        }
      }

      return {
        success: false,
        message: 'Authentication failed'
      }
    } catch (error) {
      console.error('🔴 Signin failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during signin'
      }
    }
  }

  private static getAuthErrorMessage(errorMessage: string): string {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.'
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please verify your email address before signing in. Check your inbox for a verification email.'
    }
    if (errorMessage.includes('Too many requests')) {
      return 'Too many sign-in attempts. Please wait a moment before trying again.'
    }
    return errorMessage
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { success: false, message: error.message }
      }
      return { success: true, message: 'Signed out successfully' }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sign out'
      }
    }
  }

  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        return { user: null, error }
      }
      return { user, error: null }
    } catch (error) {
      return { user: null, error }
    }
  }

  static async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        return { session: null, error }
      }
      return { session, error: null }
    } catch (error) {
      return { session: null, error }
    }
  }

  // Sign in with Google OAuth
  static async signInWithGoogle(redirectTo?: string) {
    try {
      console.log('🔵 Starting Google OAuth signin...')
      
      const redirectUrl = redirectTo || window.location.origin
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('🔴 Google OAuth error:', error)
        return {
          success: false,
          message: error.message || 'Failed to sign in with Google'
        }
      }

      console.log('🟢 Google OAuth redirect initiated')
      return {
        success: true,
        message: 'Redirecting to Google...',
        data
      }
    } catch (error) {
      console.error('🔴 Google OAuth failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sign in with Google'
      }
    }
  }

  // Sign in with GitHub OAuth
  static async signInWithGitHub(redirectTo?: string) {
    try {
      console.log('🔵 Starting GitHub OAuth signin...')
      
      const redirectUrl = redirectTo || window.location.origin
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirectUrl)}`
        }
      })

      if (error) {
        console.error('🔴 GitHub OAuth error:', error)
        return {
          success: false,
          message: error.message || 'Failed to sign in with GitHub'
        }
      }

      console.log('🟢 GitHub OAuth redirect initiated')
      return {
        success: true,
        message: 'Redirecting to GitHub...',
        data
      }
    } catch (error) {
      console.error('🔴 GitHub OAuth failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sign in with GitHub'
      }
    }
  }

  // Request password reset (sends OTP via email)
  static async requestPasswordReset(email: string) {
    try {
      // Check if user exists in our database
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', email)
        .single()

      if (profileError || !userProfile) {
        return {
          success: false,
          message: 'No account found with this email address.'
        }
      }

      // Send OTP email using API endpoint
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: result.error || 'Failed to send reset email'
        }
      }

      return {
        success: true,
        message: 'Password reset code sent to your email'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send reset email'
      }
    }
  }

  // Verify OTP and reset password
  static async resetPasswordWithOTP(email: string, otp: string, newPassword: string) {
    try {
      // Verify OTP
      const otpResponse = await fetch('/api/auth/forgot-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })

      const otpResult = await otpResponse.json()
      
      if (!otpResponse.ok) {
        return {
          success: false,
          message: otpResult.error || 'Invalid or expired OTP'
        }
      }

      // Reset password using API endpoint
      const resetResponse = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, newPassword }),
      })

      const resetResult = await resetResponse.json()

      if (!resetResponse.ok) {
        return {
          success: false,
          message: resetResult.error || 'Failed to reset password'
        }
      }

      return {
        success: true,
        message: 'Password successfully reset! You can now sign in with your new password.'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reset password'
      }
    }
  }
}