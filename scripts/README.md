# Database Setup Scripts

## Files

### `supabase-schema.sql`
Complete database schema for Seven Talent Hub with Supabase Auth integration. Includes:
- All tables (profiles, consultants, clients, activities, notifications)
- Profiles table connected to `auth.users` via foreign key
- Automatic profile creation trigger when users sign up
- Indexes for performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates
- Sample queries and helpful notes

## How to Use

### 1. Setup Supabase Database

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase-schema.sql`
5. Paste and click **Run**

**Important**: The schema uses Supabase Auth. Users will be created in `auth.users` and profiles will be automatically created via trigger.

### 2. Verify Tables Created

After running the schema, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `activities`
- `clients`
- `consultants`
- `notifications`
- `profiles`

### 3. Verify Trigger Created

Check that the profile creation trigger exists:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### 4. Create Storage Buckets

Go to **Storage** section in Supabase Dashboard and create:

1. **avatars** bucket
   - Make it public
   - Used for user profile pictures

2. **consultant-cvs** bucket
   - Can be public or authenticated
   - Used for consultant CV files

### 5. Set Up Environment Variables

1. Copy `env.example` to `.env` in the Backend directory
2. Fill in all required values:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key (bypasses RLS)
   - `SUPABASE_JWT_SECRET` - JWT secret from Supabase
   - Redis URL (for password reset codes, etc.)
   - SMTP settings (for email delivery)

3. For Frontend:
   - Copy `.env.example` to `.env` in Frontend directory
   - Fill in:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_API_BASE_URL`

### 6. Create Initial Admin User

#### Method 1: Via Supabase Dashboard
1. Go to **Authentication > Users** in Supabase Dashboard
2. Click **Add User**
3. Fill in email and password
4. After user is created, update the profile:

```sql
UPDATE profiles 
SET 
  name = 'Admin User',
  username = 'admin',
  role = 'admin',
  active = true
WHERE email = 'admin@sth.com';
```

#### Method 2: Via Backend API (after creating user in Supabase)
Once you have a user in Supabase Auth, you can update their profile via SQL:

```sql
UPDATE profiles 
SET 
  name = 'Admin User',
  username = 'admin',
  role = 'admin'
WHERE id = 'user-uuid-here';
```

#### Method 3: Via Code (Admin Script)
Create a script to seed admin user programmatically using Supabase Admin API.

## Authentication Flow

1. **User Login**:
   - Frontend calls `authService.login(username, password)`
   - Service finds profile by username/email
   - Uses Supabase Auth `signInWithPassword` to verify credentials
   - Returns session token

2. **Session Management**:
   - Supabase Auth handles session persistence
   - Frontend stores session in localStorage
   - Backend validates tokens via Supabase Auth API

3. **Profile Creation**:
   - When user signs up via Supabase Auth, trigger automatically creates profile
   - Profile is linked to `auth.users.id` via foreign key

## Mail Delivery Setup

The system uses two methods for emails:

1. **Supabase Auth Emails** (for password reset):
   - Configure in Supabase Dashboard > Authentication > Email Templates
   - Uses Supabase's built-in email service

2. **Custom SMTP** (for custom emails):
   - Configure SMTP settings in backend `.env`
   - Used for password reset codes, email verification, etc.

### Configure Supabase Email Settings

1. Go to **Authentication > Email Templates** in Supabase Dashboard
2. Customize templates as needed
3. Configure SMTP in **Project Settings > Auth** (optional, uses Supabase default if not configured)

## Troubleshooting

### Profile Not Created on Signup
- Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
- Check logs in Supabase Dashboard for errors

### RLS Policy Issues
The backend uses service role key which bypasses RLS. If you're testing from frontend directly:
- Check RLS policies are set correctly
- Verify user has proper role in profile table

### Authentication Errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Check backend `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Ensure JWT_SECRET matches Supabase project settings

### Storage Bucket Access
- Make sure buckets exist in Supabase Storage
- Check bucket policies allow uploads
- Verify file size limits are appropriate

## Maintenance

### Backup Database
Regularly backup your Supabase database:
- Use Supabase Dashboard > Settings > Database > Backups
- Or use `pg_dump` for manual backups

### Monitor Performance
Check slow queries:
```sql
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;
```

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
