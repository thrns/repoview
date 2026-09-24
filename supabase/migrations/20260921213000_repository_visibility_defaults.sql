alter table public.repositories
  alter column default_rules set default '{"hidden":[".env*","**/.env*","**/secrets/**","**/credentials/**","**/*.pem","**/*.key",".git/**","node_modules/**"],"allowOnly":[]}'::jsonb;

update public.repositories
set default_rules = '{"hidden":[".env*","**/.env*","**/secrets/**","**/credentials/**","**/*.pem","**/*.key",".git/**","node_modules/**"],"allowOnly":[]}'::jsonb
where default_rules = '{}'::jsonb;
