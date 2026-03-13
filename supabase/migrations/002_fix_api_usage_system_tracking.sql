-- Fix api_usage tracking for shared/system-level API keys.
-- Date: 2026-03-12

-- Remove duplicate null-user rows before adding a unique index for system usage.
delete from api_usage older
using api_usage newer
where older.user_id is null
  and newer.user_id is null
  and older.api_name = newer.api_name
  and older.month = newer.month
  and older.id < newer.id;

alter table api_usage
  drop constraint if exists api_usage_user_id_api_name_month_key;

create unique index if not exists idx_api_usage_user_month_unique
  on api_usage(user_id, api_name, month)
  where user_id is not null;

create unique index if not exists idx_api_usage_system_month_unique
  on api_usage(api_name, month)
  where user_id is null;

create or replace function public.increment_api_usage(
  p_user_id uuid,
  p_api_name text,
  p_month text
)
returns void as $$
begin
  if p_user_id is null then
    insert into api_usage (user_id, api_name, call_count, month)
    values (null, p_api_name, 1, p_month)
    on conflict (api_name, month) where user_id is null
    do update set
      call_count = api_usage.call_count + 1,
      updated_at = now();
  else
    insert into api_usage (user_id, api_name, call_count, month)
    values (p_user_id, p_api_name, 1, p_month)
    on conflict (user_id, api_name, month) where user_id is not null
    do update set
      call_count = api_usage.call_count + 1,
      updated_at = now();
  end if;
end;
$$ language plpgsql security definer;
