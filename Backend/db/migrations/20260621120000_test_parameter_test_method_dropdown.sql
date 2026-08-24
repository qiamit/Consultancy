-- Test Parameter Master — managed test method catalog (+ button in form)
insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('test_parameter_master.test_method', 'Visual Examination', null, 10),
  ('test_parameter_master.test_method', 'Chemical Analysis', null, 20),
  ('test_parameter_master.test_method', 'Physical Test', null, 30),
  ('test_parameter_master.test_method', 'Mechanical Test', null, 40),
  ('test_parameter_master.test_method', 'Electrical Test', null, 50),
  ('test_parameter_master.test_method', 'Microbiological Test', null, 60),
  ('test_parameter_master.test_method', 'Annex', null, 70),
  ('test_parameter_master.test_method', 'As per IS', null, 80)
on conflict (option_key, value) do nothing;

notify pgrst, 'reload schema';
