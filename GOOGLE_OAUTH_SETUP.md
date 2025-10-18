# Google OAuth Setup Guide

This guide will walk you through setting up Google OAuth authentication for your AI Portfolio Generator app.

## Prerequisites

- A Supabase project (already configured)
- A Google Cloud Platform account

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

### 1.2 Enable Google+ API
1. In the left sidebar, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### 1.3 Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: AI Portfolio Generator
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Save and Continue**
6. On the **Test users** page (optional), add test users if needed
7. Click **Save and Continue**
8. Review and click **Back to Dashboard**

### 1.4 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Fill in the details:
   - **Name**: AI Portfolio (or any name you prefer)
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (for local development)
     - Your production domain (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/api/auth/callback` (for local development)
     - `https://your-supabase-project.supabase.co/auth/v1/callback` (get this from Supabase)
     - Your production callback URL
5. Click **Create**
6. **Important**: Copy the **Client ID** and **Client Secret** that appear

## Step 2: Configure Supabase

### 2.1 Add Google Provider to Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. In the left sidebar, go to **Authentication** → **Providers**
4. Find **Google** in the list and toggle it **ON**
5. Paste your **Google Client ID** and **Google Client Secret**
6. Click **Save**

### 2.2 Get Supabase Callback URL
1. In the same **Providers** page, scroll down to find your Supabase callback URL
2. It should look like: `https://your-project.supabase.co/auth/v1/callback`
3. Copy this URL

### 2.3 Update Google OAuth Settings
1. Go back to Google Cloud Console
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID
4. Add the Supabase callback URL to **Authorized redirect URIs**:
   - `https://your-project.supabase.co/auth/v1/callback`
5. Click **Save**

## Step 3: Configure Site URL in Supabase

1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Set your **Site URL**:
   - For local development: `http://localhost:3001`
   - For production: Your production domain
3. Add **Redirect URLs**:
   - `http://localhost:3001/api/auth/callback`
   - Your production callback URL
4. Click **Save**

## Step 4: Test the Integration

### 4.1 Local Testing
1. Make sure your dev server is running at `http://localhost:3001`
2. Navigate to the login page: `http://localhost:3001/login`
3. Click the **Google** button
4. You should be redirected to Google's login page
5. After successful authentication, you'll be redirected back to your app

### 4.2 Verify User Profile Creation
After a user signs in with Google:
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. You should see the new user listed
3. Check if a corresponding profile was created in the `user_profiles` table:
   - Go to **Database** → **Table Editor** → **user_profiles**
   - Look for the user with matching ID

## Optional: GitHub OAuth Setup

To enable GitHub authentication as well:

### 1. Create GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - **Application name**: AI Portfolio Generator
   - **Homepage URL**: `http://localhost:3001` (or your domain)
   - **Authorization callback URL**: `https://your-project.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**

### 2. Configure in Supabase
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Find **GitHub** and toggle it **ON**
3. Paste your **GitHub Client ID** and **Client Secret**
4. Click **Save**

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Cloud Console exactly matches the one from Supabase
- Check for trailing slashes and http vs https

### Error: "Access blocked: This app's request is invalid"
- Ensure you've completed the OAuth consent screen configuration
- Add your email as a test user if the app is in testing mode

### User created but no profile in database
- Check if the `user_profiles` table exists in your database
- Verify that the database trigger is set up correctly (see `supabase/schema.sql`)
- Check Supabase logs for any errors during profile creation

### OAuth works but redirects to wrong page
- Check the `redirectTo` parameter in the OAuth configuration
- Verify the Site URL and Redirect URLs in Supabase settings

## Production Deployment

When deploying to production:

1. **Update Google OAuth**:
   - Add your production domain to Authorized JavaScript origins
   - Add your production callback URL to Authorized redirect URIs

2. **Update Supabase**:
   - Set the production Site URL
   - Add production redirect URLs

3. **OAuth Consent Screen**:
   - If your app is in testing mode, publish it for public use
   - Complete the verification process if required

## Security Best Practices

1. **Never commit credentials**: Keep your Google Client Secret secure
2. **Use environment variables**: Store sensitive data in `.env.local`
3. **Enable email verification**: Consider requiring email verification for new accounts
4. **Set up proper RLS policies**: Ensure your database has proper Row Level Security policies
5. **Monitor usage**: Regularly check Google Cloud Console for unusual OAuth activity

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Check Supabase logs in the Dashboard → **Logs** → **Auth Logs**
3. Verify all URLs match exactly (no typos or missing slashes)
4. Ensure the database schema is properly deployed
