-- Functions were executable via PUBLIC; restrict to signed-in users (admin checks happen inside).
do $$
declare f text;
begin
  foreach f in array array[
    'public.handle_new_user()', 'public.guard_beat()', 'public.guard_producer_profile()'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'public.create_order_from_cart(text)', 'public.claim_free_licence(uuid, text)', 'public.request_payout(int)',
    'public.submit_payment_reference(uuid, text)', 'public.cancel_my_order(uuid)',
    'public.admin_mark_order_paid(uuid, text)', 'public.admin_cancel_order(uuid, text)', 'public.admin_refund_order(uuid, text)',
    'public.admin_review_producer(uuid, boolean, text, boolean)', 'public.admin_review_beat(uuid, boolean, text)',
    'public.admin_process_payout(uuid, boolean, text)', 'public.admin_stats()', 'public.wallet_summary(uuid)',
    'public.hash_in_use(text)', 'public.can_download_master(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
-- is_admin (used inside RLS), verify_licence and increment_play stay callable by visitors on purpose.
