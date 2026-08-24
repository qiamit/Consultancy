-- Separate country calling code from national mobile digits; configurable via app_dropdown_options.

alter table public.clients
  add column if not exists phone_country_code text not null default '+91';

comment on column public.clients.phone_country_code is 'E.164-style calling code (e.g. +91). National digits live in clients.phone.';

insert into public.app_dropdown_options (option_key, value, label, sort_order) values
  ('client_master.phone_country_code', '+91', 'India (+91)', 10),
  ('client_master.phone_country_code', '+1', 'USA / Canada (+1)', 20),
  ('client_master.phone_country_code', '+44', 'United Kingdom (+44)', 30),
  ('client_master.phone_country_code', '+971', 'UAE (+971)', 40),
  ('client_master.phone_country_code', '+61', 'Australia (+61)', 50),
  ('client_master.phone_country_code', '+65', 'Singapore (+65)', 60),
  ('client_master.phone_country_code', '+86', 'China (+86)', 70),
  ('client_master.phone_country_code', '+81', 'Japan (+81)', 80),
  ('client_master.phone_country_code', '+49', 'Germany (+49)', 90),
  ('client_master.phone_country_code', '+33', 'France (+33)', 100),
  ('client_master.phone_country_code', '+39', 'Italy (+39)', 110),
  ('client_master.phone_country_code', '+34', 'Spain (+34)', 120),
  ('client_master.phone_country_code', '+31', 'Netherlands (+31)', 130),
  ('client_master.phone_country_code', '+32', 'Belgium (+32)', 140),
  ('client_master.phone_country_code', '+46', 'Sweden (+46)', 150),
  ('client_master.phone_country_code', '+47', 'Norway (+47)', 160),
  ('client_master.phone_country_code', '+45', 'Denmark (+45)', 170),
  ('client_master.phone_country_code', '+353', 'Ireland (+353)', 180),
  ('client_master.phone_country_code', '+41', 'Switzerland (+41)', 190),
  ('client_master.phone_country_code', '+43', 'Austria (+43)', 200),
  ('client_master.phone_country_code', '+48', 'Poland (+48)', 210),
  ('client_master.phone_country_code', '+27', 'South Africa (+27)', 220),
  ('client_master.phone_country_code', '+880', 'Bangladesh (+880)', 230),
  ('client_master.phone_country_code', '+94', 'Sri Lanka (+94)', 240),
  ('client_master.phone_country_code', '+92', 'Pakistan (+92)', 250),
  ('client_master.phone_country_code', '+977', 'Nepal (+977)', 260),
  ('client_master.phone_country_code', '+66', 'Thailand (+66)', 270),
  ('client_master.phone_country_code', '+60', 'Malaysia (+60)', 280),
  ('client_master.phone_country_code', '+63', 'Philippines (+63)', 290),
  ('client_master.phone_country_code', '+82', 'South Korea (+82)', 300),
  ('client_master.phone_country_code', '+852', 'Hong Kong (+852)', 310),
  ('client_master.phone_country_code', '+886', 'Taiwan (+886)', 320),
  ('client_master.phone_country_code', '+254', 'Kenya (+254)', 330),
  ('client_master.phone_country_code', '+234', 'Nigeria (+234)', 340),
  ('client_master.phone_country_code', '+20', 'Egypt (+20)', 350),
  ('client_master.phone_country_code', '+55', 'Brazil (+55)', 360),
  ('client_master.phone_country_code', '+52', 'Mexico (+52)', 370),
  ('client_master.phone_country_code', '+54', 'Argentina (+54)', 380),
  ('client_master.phone_country_code', '+64', 'New Zealand (+64)', 390)
on conflict (option_key, value) do nothing;
