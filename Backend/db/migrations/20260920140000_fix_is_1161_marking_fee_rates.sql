-- Fix IS 1161:2014 marking fee / slab unit rate from official BIS schedule
-- (Marking Fee for all products under certification Scheme-I):
-- Large 68000, Medium 45000, Small 34000, Micro 13600,
-- Unit 1 Tonne, Slab-1 rate 8.7 for All Quantities.
-- Only fills missing/zero values so intentional custom rates are preserved.

update public.is_codes
set
  mmf_large_scale = case
    when mmf_large_scale is null or mmf_large_scale = 0 then 68000
    else mmf_large_scale
  end,
  mmf_medium_scale = case
    when mmf_medium_scale is null or mmf_medium_scale = 0 then 45000
    else mmf_medium_scale
  end,
  mmf_small_scale = case
    when mmf_small_scale is null or mmf_small_scale = 0 then 34000
    else mmf_small_scale
  end,
  mmf_micro_scale = case
    when mmf_micro_scale is null or mmf_micro_scale = 0 then 13600
    else mmf_micro_scale
  end,
  unit_of_is = case
    when nullif(trim(unit_of_is), '') is null then '1 Tonne'
    else unit_of_is
  end,
  slab_1_quantity = case
    when slab_1_rate is null or slab_1_rate = 0 then 'All Quantities'
    when nullif(trim(slab_1_quantity), '') is null then 'All Quantities'
    else slab_1_quantity
  end,
  slab_1_rate = case
    when slab_1_rate is null or slab_1_rate = 0 then 8.7
    else slab_1_rate
  end,
  updated_at = now()
where regexp_replace(upper(trim(is_number)), '[^0-9]', '', 'g') = '1161'
  and revision_year = 2014
  and (
    slab_1_rate is null
    or slab_1_rate = 0
    or mmf_large_scale is null
    or mmf_large_scale = 0
    or mmf_medium_scale is null
    or mmf_medium_scale = 0
    or mmf_small_scale is null
    or mmf_small_scale = 0
    or mmf_micro_scale is null
    or mmf_micro_scale = 0
  );
