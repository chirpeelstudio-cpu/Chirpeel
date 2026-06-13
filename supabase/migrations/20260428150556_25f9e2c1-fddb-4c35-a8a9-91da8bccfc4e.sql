-- Seed demo user for /studio dashboard preview
DO $$
DECLARE
  demo_user_id uuid;
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'demo@chirpeel.test' LIMIT 1;

  IF existing_id IS NULL THEN
    demo_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated',
      'authenticated',
      'demo@chirpeel.test',
      crypt('Demo@1234', gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',ARRAY['email']),
      jsonb_build_object('full_name','Demo Studio'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      demo_user_id,
      demo_user_id::text,
      jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@chirpeel.test', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;