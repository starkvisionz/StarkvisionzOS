-- =============================================================================
-- StarkControls (SVH-PROD-007) — migration 0001: core schema
--
-- Conventions enforced here:
--   * every money column is numeric(15,2)  (never float / double precision)
--   * every stored instant is timestamptz   (UTC at rest)
--   * multi-tenancy is enforced by RLS: every table resolves back to
--     projects.org_id and is compared against the `org_id` JWT claim.
--
-- Requires the Supabase `auth` schema (auth.jwt()).  For a plain Postgres
-- instance used in local testing, apply db/seed/local_auth_shim.sql first.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Tenancy root
-- -----------------------------------------------------------------------------

create table orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id),
  code text not null,
  name text not null,
  currency char(3) default 'USD',
  timezone text default 'America/Chicago',
  data_date date,
  budget_at_completion numeric(15,2),
  created_at timestamptz default now(),
  unique (org_id, code)
);

-- -----------------------------------------------------------------------------
-- Work breakdown structure
-- -----------------------------------------------------------------------------

create table wbs_nodes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references wbs_nodes(id),
  code text not null,
  name text not null,
  unique (project_id, code)
);

-- -----------------------------------------------------------------------------
-- Schedule
-- -----------------------------------------------------------------------------

create table schedule_snapshots (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  data_date date not null,
  source_file_r2_key text not null,
  is_baseline boolean default false,
  imported_at timestamptz default now()
);

create table activities (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id uuid not null references schedule_snapshots(id) on delete cascade,
  wbs_id uuid references wbs_nodes(id),
  activity_id text not null,
  name text not null,
  orig_dur_days numeric(8,2),
  rem_dur_days numeric(8,2),
  early_start timestamptz, early_finish timestamptz,
  late_start timestamptz,  late_finish timestamptz,
  actual_start timestamptz, actual_finish timestamptz,
  total_float_days numeric(8,2),
  is_critical boolean generated always as (total_float_days <= 0) stored,
  pct_complete numeric(5,2) default 0,
  calendar_id text,
  unique (snapshot_id, activity_id)
);

create table relationships (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id uuid not null references schedule_snapshots(id) on delete cascade,
  pred_activity_id text not null,
  succ_activity_id text not null,
  link_type text check (link_type in ('FS','SS','FF','SF')),
  lag_days numeric(8,2) default 0
);

-- -----------------------------------------------------------------------------
-- Cost
-- -----------------------------------------------------------------------------

create table cost_accounts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_id uuid references wbs_nodes(id),
  code text not null,
  description text,
  budget numeric(15,2) not null default 0,
  unique (project_id, code)
);

create table period_actuals (
  id uuid primary key default uuid_generate_v4(),
  cost_account_id uuid not null references cost_accounts(id) on delete cascade,
  period_end date not null,
  acwp numeric(15,2) not null default 0,
  earned_pct numeric(5,2),
  unique (cost_account_id, period_end)
);

-- -----------------------------------------------------------------------------
-- Change management
-- -----------------------------------------------------------------------------

create table pcos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  pco_number text not null,
  title text not null,
  status text check (status in ('draft','submitted','negotiation','approved','rejected','withdrawn')) default 'draft',
  rom_value numeric(15,2),
  approved_value numeric(15,2),
  schedule_impact_days integer default 0,
  submitted_date date, resolved_date date,
  narrative text,
  unique (project_id, pco_number)
);

-- -----------------------------------------------------------------------------
-- Analytics outputs
-- -----------------------------------------------------------------------------

create table dcma_results (
  id uuid primary key default uuid_generate_v4(),
  snapshot_id uuid not null references schedule_snapshots(id) on delete cascade,
  metric text not null,
  value numeric(12,4),
  threshold numeric(12,4),
  pass boolean,
  detail jsonb
);

create table evm_results (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  wbs_id uuid references wbs_nodes(id),
  period_end date not null,
  bcws numeric(15,2), bcwp numeric(15,2), acwp numeric(15,2),
  cpi numeric(8,4), spi numeric(8,4),
  eac numeric(15,2), etc numeric(15,2), vac numeric(15,2), tcpi numeric(8,4),
  computed_at timestamptz default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index idx_activities_snapshot on activities(snapshot_id);
create index idx_relationships_snapshot on relationships(snapshot_id);
create index idx_evm_project_period on evm_results(project_id, period_end);

-- Supporting indexes for the RLS join-through predicates and FK lookups.
create index idx_wbs_nodes_project on wbs_nodes(project_id);
create index idx_schedule_snapshots_project on schedule_snapshots(project_id);
create index idx_cost_accounts_project on cost_accounts(project_id);
create index idx_period_actuals_cost_account on period_actuals(cost_account_id);
create index idx_pcos_project on pcos(project_id);
create index idx_dcma_results_snapshot on dcma_results(snapshot_id);
create index idx_projects_org on projects(org_id);

-- =============================================================================
-- Row level security
--
-- Each policy is `for all` with only a USING clause; Postgres reuses USING as
-- the WITH CHECK expression for INSERT/UPDATE, so writes are constrained to the
-- caller's org exactly as reads are.
-- =============================================================================

alter table orgs enable row level security;
create policy org_isolation on orgs
  using (id = (auth.jwt() ->> 'org_id')::uuid);

alter table projects enable row level security;
create policy org_isolation on projects
  using (org_id = (auth.jwt() ->> 'org_id')::uuid);

-- --- direct project_id children ---------------------------------------------

alter table wbs_nodes enable row level security;
create policy org_isolation on wbs_nodes
  using (exists (
    select 1 from projects p
    where p.id = wbs_nodes.project_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table schedule_snapshots enable row level security;
create policy org_isolation on schedule_snapshots
  using (exists (
    select 1 from projects p
    where p.id = schedule_snapshots.project_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table cost_accounts enable row level security;
create policy org_isolation on cost_accounts
  using (exists (
    select 1 from projects p
    where p.id = cost_accounts.project_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table pcos enable row level security;
create policy org_isolation on pcos
  using (exists (
    select 1 from projects p
    where p.id = pcos.project_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table evm_results enable row level security;
create policy org_isolation on evm_results
  using (exists (
    select 1 from projects p
    where p.id = evm_results.project_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

-- --- snapshot_id -> project_id children --------------------------------------

alter table activities enable row level security;
create policy org_isolation on activities
  using (exists (
    select 1 from schedule_snapshots s
    join projects p on p.id = s.project_id
    where s.id = activities.snapshot_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table relationships enable row level security;
create policy org_isolation on relationships
  using (exists (
    select 1 from schedule_snapshots s
    join projects p on p.id = s.project_id
    where s.id = relationships.snapshot_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

alter table dcma_results enable row level security;
create policy org_isolation on dcma_results
  using (exists (
    select 1 from schedule_snapshots s
    join projects p on p.id = s.project_id
    where s.id = dcma_results.snapshot_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));

-- --- cost_account_id -> project_id children ----------------------------------

alter table period_actuals enable row level security;
create policy org_isolation on period_actuals
  using (exists (
    select 1 from cost_accounts c
    join projects p on p.id = c.project_id
    where c.id = period_actuals.cost_account_id
      and p.org_id = (auth.jwt() ->> 'org_id')::uuid
  ));
