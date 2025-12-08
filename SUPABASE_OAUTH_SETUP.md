# Setting Up Google OAuth with Supabase

This guide will walk you through activating Google OAuth for your PromptForge application.

## Step 1: Create a Google OAuth Application

1. **Go to Google Cloud Console**

   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select an existing one)

   - Click the project dropdown at the top
   - Click "New Project"
   - Enter a project name (e.g., "PromptForge")
   - Click "Create"

3. **Configure OAuth Consent Screen**

   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have a Google Workspace)
   - Fill in the required information:
     - App name: `PromptForge`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - On "Scopes" page, click "Save and Continue"
   - On "Test users" page, add your email if needed, then "Save and Continue"
   - Review and go back to dashboard

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: **Web application**
   - Name: `PromptForge Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://your-production-domain.com
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:3000/auth/callback
     https://your-production-domain.com/auth/callback
     https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     ⚠️ **Important:** Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference (you'll get this from Supabase dashboard)
   - Click "Create"
   - **Copy the Client ID and Client Secret** - you'll need these for Supabase

## Step 2: Configure Supabase

1. **Go to Supabase Dashboard**

   - Visit: https://supabase.com/dashboard
   - Sign in and select your project

2. **Enable Google Provider**

   - Go to "Authentication" > "Providers"
   - Find "Google" in the list
   - Toggle it to **Enabled**

3. **Add Google OAuth Credentials**

   - In the Google provider settings, enter:
     - **Client ID (for OAuth):** Paste your Google Client ID
     - **Client Secret (for OAuth):** Paste your Google Client Secret
   - Click "Save"

4. **Get Your Supabase Project URL**

   - Go to "Settings" > "API"
   - Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy your **Project Reference** (the `xxxxx` part)

5. **Update Google Redirect URI**
   - Go back to Google Cloud Console
   - Edit your OAuth 2.0 Client ID
   - Add this redirect URI (replace `xxxxx` with your Supabase project reference):
     ```
     https://xxxxx.supabase.co/auth/v1/callback
     ```
   - Save the changes

## Step 3: Configure Your Environment Variables

Make sure your `.env.local` file in the `web` directory has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

You can find these in Supabase Dashboard > Settings > API:

- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = service_role key (keep this secret!)

## Step 4: Test the OAuth Flow

1. **Start your development server:**

   ```bash
   cd web
   npm run dev
   ```

2. **Visit your app:**
   - Go to `http://localhost:3000`
   - You should be redirected to `/login`
   - Click "Continue with Google"
   - You should be redirected to Google's sign-in page
   - After signing in, you'll be redirected back to your app

## Troubleshooting

### "Redirect URI mismatch" error

- Make sure you've added ALL redirect URIs in Google Cloud Console:
  - `http://localhost:3000/auth/callback` (for local dev)
  - `https://xxxxx.supabase.co/auth/v1/callback` (Supabase callback)
  - Your production domain callback URL

### "OAuth client not found" error

- Verify your Client ID and Client Secret are correct in Supabase
- Ensure the OAuth consent screen is published and the correct project is selected

### "Invalid client" error

- Check that your Google OAuth credentials are correctly entered in Supabase
- Ensure the OAuth consent screen is properly configured

### Not redirecting after login

- Check that your Supabase project URL is correct in environment variables
- Verify the callback route exists at `/auth/callback`

## Production Setup

When deploying to production:

1. **Update Google OAuth settings:**

   - Add your production domain to "Authorized JavaScript origins"
   - Add your production callback URL to "Authorized redirect URIs"

2. **Update environment variables:**

   - Set production environment variables in your hosting platform
   - Never commit `.env.local` to git

3. **Update Supabase settings:**
   - Go to "Authentication" > "URL Configuration"
   - Add your production site URL to "Site URL"
   - Add your production callback URL to "Redirect URLs"

## Security Notes

- ⚠️ Never commit your `.env.local` file to version control
- ⚠️ Keep your `SUPABASE_SERVICE_ROLE_KEY` secret - it bypasses RLS
- ⚠️ The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (it's public)
- ✅ Use environment variables for all sensitive configuration
