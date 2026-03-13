# Google OAuth Setup Guide

To enable Google OAuth authentication, follow these steps:

## 1. Create Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client IDs"**

## 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless using Google Workspace)
3. Fill in required fields:
   - App name: `AI Dubbing Service`
   - User support email: your email
   - Developer contact information: your email
4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
5. Save and continue

## 3. Create OAuth 2.0 Client ID

1. Return to **Credentials** page
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth 2.0 Client IDs"**
3. Select **Web application**
4. Configure:
   - Name: `AI Dubbing Web App`
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## 4. Update Environment Variables

Update your `.env.local` file:

```bash
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
NEXTAUTH_SECRET=generate_a_random_secret_here
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

## 5. Email Whitelist Configuration

The app uses email whitelisting for access control. In development mode, these emails are pre-approved:

- `admin@example.com`
- `test@example.com`
- `user@example.com`

To test with your Google email, temporarily add it to the `allowedEmails` array in `db/index.ts`.

For production, you'll need to:
1. Set up a Turso database
2. Add your email to the `allowed_users` table
3. Configure `DATABASE_URL` and `DATABASE_AUTH_TOKEN` environment variables

## 6. Test Authentication

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click **"Login with Google"**
4. Complete the Google OAuth flow
5. If your email is whitelisted, you'll be redirected to `/dashboard`
6. If not whitelisted, you'll see an access denied error

## Production Deployment

For production deployment on Vercel:

1. Add all environment variables to Vercel dashboard
2. Update authorized origins and redirect URIs:
   - Origins: `https://your-domain.com`
   - Redirect URI: `https://your-domain.com/api/auth/callback/google`
3. Set up Turso database with proper email whitelist