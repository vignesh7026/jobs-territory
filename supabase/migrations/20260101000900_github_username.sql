-- Optional public GitHub username, used only to suggest skills from public repositories the person chooses to scan.
alter table public.profiles
  add column github_username text check (github_username is null or github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$');
grant update (github_username) on public.profiles to authenticated;
