begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.gambit_rooms (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_uid uuid not null references auth.users(id) on delete cascade,
  guest_uid uuid references auth.users(id) on delete set null,
  game jsonb not null check (jsonb_typeof(game) = 'object' and jsonb_typeof(game->'moves') = 'array' and jsonb_array_length(game->'moves') <= 2048 and game->>'hostColor' in ('w','b')),
  revision bigint not null default 0 check (revision >= 0),
  host_seen timestamptz not null default now(),
  guest_seen timestamptz,
  host_left boolean not null default false,
  guest_left boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  check (guest_uid is null or guest_uid <> host_uid)
);
create index gambit_rooms_host_created on public.gambit_rooms(host_uid, created_at);
create table public.gambit_commands (
  room_code text not null references public.gambit_rooms(code) on delete cascade,
  command_id uuid not null,
  actor_uid uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  applied_revision bigint not null,
  primary key (room_code, command_id)
);

alter table public.gambit_rooms enable row level security;
alter table public.gambit_commands enable row level security;
revoke all on public.gambit_rooms from anon, authenticated;
revoke all on public.gambit_commands from anon, authenticated;
grant select on public.gambit_rooms to authenticated;
grant all on public.gambit_rooms, public.gambit_commands to service_role;
create policy gambit_member_read on public.gambit_rooms for select to authenticated
  using ((select auth.uid()) = host_uid or (select auth.uid()) = guest_uid);

create function public.gambit_create_room(p_actor uuid, p_code text, p_game jsonb)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare r public.gambit_rooms;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text, 0));
  if (select count(*) from public.gambit_rooms where host_uid = p_actor and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'room_rate_limit';
  end if;
  insert into public.gambit_rooms(code, host_uid, game) values (p_code, p_actor, p_game) returning * into r;
  return r;
end $$;

create function public.gambit_join_room(p_actor uuid, p_code text, p_name text)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare r public.gambit_rooms;
begin
  if char_length(p_name) < 1 or char_length(p_name) > 24 then raise exception 'invalid_name'; end if;
  select * into r from public.gambit_rooms where code = p_code for update;
  if not found then raise exception 'room_not_found'; end if;
  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  if r.host_uid = p_actor then
    update public.gambit_rooms set host_seen = now(), host_left = false where code = p_code returning * into r;
  elsif r.guest_uid = p_actor then
    update public.gambit_rooms set guest_seen = now(), guest_left = false where code = p_code returning * into r;
  elsif r.guest_uid is not null then
    raise exception 'room_full';
  elsif r.host_left or r.host_seen < now() - interval '45 seconds' then
    raise exception 'host_offline';
  else
    update public.gambit_rooms set guest_uid = p_actor, guest_seen = now(), guest_left = false,
      game = jsonb_set(game, '{guestName}', to_jsonb(p_name)), revision = revision + 1
      where code = p_code returning * into r;
  end if;
  return r;
end $$;

create function public.gambit_heartbeat(p_code text, p_online boolean default true)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare r public.gambit_rooms; actor uuid := auth.uid();
begin
  if actor is null then raise exception 'not_authenticated'; end if;
  select * into r from public.gambit_rooms where code = p_code and (host_uid = actor or guest_uid = actor) for update;
  if not found then raise exception 'room_not_found'; end if;
  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  if r.host_uid = actor then
    update public.gambit_rooms set host_seen = now(), host_left = not p_online where code = p_code returning * into r;
  else
    update public.gambit_rooms set guest_seen = now(), guest_left = not p_online where code = p_code returning * into r;
  end if;
  return r;
end $$;

create function public.gambit_commit_command(p_actor uuid, p_code text, p_command uuid, p_fingerprint text, p_revision bigint, p_game jsonb)
returns public.gambit_rooms language plpgsql security definer set search_path = '' as $$
declare r public.gambit_rooms; previous public.gambit_commands;
begin
  select * into r from public.gambit_rooms where code = p_code for update;
  if not found then raise exception 'room_not_found'; end if;
  if p_actor <> r.host_uid and p_actor is distinct from r.guest_uid then raise exception 'not_member'; end if;
  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  select * into previous from public.gambit_commands where room_code = p_code and command_id = p_command;
  if found then
    if previous.actor_uid <> p_actor or previous.fingerprint <> p_fingerprint then raise exception 'idempotency_conflict'; end if;
    return r;
  end if;
  if r.revision <> p_revision then raise exception 'stale_state'; end if;
  if r.guest_uid is null or r.host_left or r.guest_left or r.host_seen < now() - interval '45 seconds' or r.guest_seen < now() - interval '45 seconds' then raise exception 'opponent_offline'; end if;
  if p_game->>'hostName' is distinct from r.game->>'hostName' or p_game->>'guestName' is distinct from r.game->>'guestName' then raise exception 'invalid_state'; end if;
  update public.gambit_rooms set game = p_game, revision = revision + 1,
    host_seen = case when p_actor = host_uid then now() else host_seen end,
    guest_seen = case when p_actor = guest_uid then now() else guest_seen end
    where code = p_code returning * into r;
  insert into public.gambit_commands(room_code, command_id, actor_uid, fingerprint, applied_revision)
    values (p_code, p_command, p_actor, p_fingerprint, r.revision);
  return r;
end $$;

revoke all on function public.gambit_create_room(uuid,text,jsonb), public.gambit_join_room(uuid,text,text), public.gambit_commit_command(uuid,text,uuid,text,bigint,jsonb) from public, anon, authenticated;
grant execute on function public.gambit_create_room(uuid,text,jsonb), public.gambit_join_room(uuid,text,text), public.gambit_commit_command(uuid,text,uuid,text,bigint,jsonb) to service_role;
revoke all on function public.gambit_heartbeat(text,boolean) from public, anon;
grant execute on function public.gambit_heartbeat(text,boolean) to authenticated;
alter publication supabase_realtime add table public.gambit_rooms;
commit;
