-- Patch 003: Missing INSERT/UPDATE policies for company creation & joining flows

-- Allow a logged-in user to create a company where they are the founder
create policy "founder creates company" on public.companies
  for insert with check (founder_id = auth.uid());

-- Allow existing members of a company to update its treasury/stats
-- (needed when a new member joins and treasury_balance increases)
create policy "members update company" on public.companies
  for update using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = companies.id and cm.user_id = auth.uid()
    )
  );

-- Allow a user to insert their own company membership row
-- (covers both founding a new company and joining an existing one)
create policy "self insert membership" on public.company_members
  for insert with check (user_id = auth.uid());

-- Allow a member to update their own membership row (e.g. stake recalculation)
create policy "self update membership" on public.company_members
  for update using (
    exists (
      select 1 from public.company_members cm2
      where cm2.company_id = company_members.company_id and cm2.user_id = auth.uid()
    )
  );

-- Allow a user to log their own treasury transactions
create policy "self insert treasury tx" on public.treasury_transactions
  for insert with check (user_id = auth.uid());

-- Allow public read of treasury transactions (transparency)
create policy "public read treasury" on public.treasury_transactions
  for select using (true);
