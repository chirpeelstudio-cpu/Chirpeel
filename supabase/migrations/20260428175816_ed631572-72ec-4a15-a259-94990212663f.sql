-- Add new role values to the existing app_role enum.
-- Must run in its own migration so they are committed before being used.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accounts';
