-- ====================================================================
-- THE ABBEY (TEMBUSU BANDROOM) - SUPABASE COMPLETE DATABASE SCHEMA
-- Paste this script into your Supabase project:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. Create INVENTORY Table
create table if not exists inventory (
  id text primary key,
  barcode text,
  name text not null,
  category text not null,
  subtype text,
  working_qty int not null default 1,
  spoilt_qty int not null default 0,
  notes text,
  updated_at timestamptz default now()
);

-- 2. Create EQUIPMENT_LOANS Table
create table if not exists equipment_loans (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  telegram_handle text not null,
  committee text,
  purpose text not null,
  base_package text default 'Set A',
  additional_notes text,
  start_date text not null,
  start_time text default '18:00',
  end_date text not null,
  end_time text default '22:00',
  equipment_list text[] default '{}',
  agreed_to_terms boolean default true,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 3. Create LOAN_ITEMS Table (Junction for stock tracking)
create table if not exists loan_items (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references equipment_loans(id) on delete cascade,
  inventory_id text references inventory(id),
  quantity int not null default 1
);

-- 4. Create BOOKINGS Table
create table if not exists bookings (
  id text primary key,
  date text not null,
  start_time text not null,
  end_time text not null,
  resident_name text not null,
  telegram_handle text not null,
  nus_email text,
  tembusu_house text,
  band_name text,
  purpose text,
  equipment_needs text[] default '{}',
  needs_door_unlock boolean default false,
  status text not null default 'confirmed',
  door_opener_handle text,
  door_claimed_at timestamptz,
  created_at timestamptz default now()
);

-- 5. Create LICENSED_USERS Table
create table if not exists licensed_users (
  id text primary key,
  telegram_handle text unique not null,
  nus_email text,
  name text not null,
  house text,
  license_ay text default 'AY26/27',
  status text not null default 'active',
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) & Public Policies for Web App
alter table inventory enable row level security;
alter table equipment_loans enable row level security;
alter table loan_items enable row level security;
alter table bookings enable row level security;
alter table licensed_users enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Allow public read inventory" on inventory;
drop policy if exists "Allow public update inventory" on inventory;
drop policy if exists "Allow public read loans" on equipment_loans;
drop policy if exists "Allow public insert loans" on equipment_loans;
drop policy if exists "Allow public update loans" on equipment_loans;
drop policy if exists "Allow public read loan_items" on loan_items;
drop policy if exists "Allow public insert loan_items" on loan_items;
drop policy if exists "Allow public read bookings" on bookings;
drop policy if exists "Allow public insert bookings" on bookings;
drop policy if exists "Allow public update bookings" on bookings;
drop policy if exists "Allow public read licenses" on licensed_users;
drop policy if exists "Allow public insert licenses" on licensed_users;
drop policy if exists "Allow public update licenses" on licensed_users;
drop policy if exists "Allow public delete licenses" on licensed_users;

create policy "Allow public read inventory" on inventory for select using (true);
create policy "Allow public update inventory" on inventory for all using (true);

create policy "Allow public read loans" on equipment_loans for select using (true);
create policy "Allow public insert loans" on equipment_loans for insert with check (true);
create policy "Allow public update loans" on equipment_loans for update using (true);

create policy "Allow public read loan_items" on loan_items for select using (true);
create policy "Allow public insert loan_items" on loan_items for insert with check (true);

create policy "Allow public read bookings" on bookings for select using (true);
create policy "Allow public insert bookings" on bookings for insert with check (true);
create policy "Allow public update bookings" on bookings for update using (true);

create policy "Allow public read licenses" on licensed_users for select using (true);
create policy "Allow public insert licenses" on licensed_users for insert with check (true);
create policy "Allow public update licenses" on licensed_users for update using (true);
create policy "Allow public delete licenses" on licensed_users for delete using (true);

-- 6. Seed All 178 Abbey Inventory Items
insert into inventory (id, barcode, name, category, subtype, working_qty) values
  ('WX001', 'WX001', 'Mogami (5M)', 'Wires', 'XLR', 1),
  ('WX002', 'WX002', 'Canare (5M)', 'Wires', 'XLR', 1),
  ('WX003', 'WX003', 'Klotz + Switchcraft Head (5M)', 'Wires', 'XLR', 0),
  ('WX004', 'WX004', 'D''Addario Custom Series (3M)', 'Wires', 'XLR', 1),
  ('WX005', 'WX005', '"Rohs Professional Low-Noise Microphone Cable" (5M)', 'Wires', 'XLR', 0),
  ('WX006', 'WX006', 'Stagg (6M)', 'Wires', 'XLR', 1),
  ('WX007', 'WX007', 'Klotz My206 Yellow And Green (7M)', 'Wires', 'XLR', 2),
  ('WX008', 'WX008', 'Blue Maruni (7M)', 'Wires', 'XLR', 1),
  ('WX009', 'WX009', 'Klotz Greyhound + Switchcraft Head (10M)', 'Wires', 'XLR', 7),
  ('WX010', 'WX010', 'Samson Tourtek (10M)', 'Wires', 'XLR', 1),
  ('WX011', 'WX011', 'Klotz MC5000 (10M)', 'Wires', 'XLR', 1),
  ('WX012', 'WX012', 'Unmarked+Neutrik Head (12M)', 'Wires', 'XLR', 1),
  ('WX013', 'WX013', 'Klotz MY206 (15M)', 'Wires', 'XLR', 1),
  ('WX014', 'WX014', 'Canare (20M)', 'Wires', 'XLR', 1),
  ('WQ001', 'WQ001', 'Red Braided Cables', 'Wires', 'QTR', 3),
  ('WQ002', 'WQ002', 'Klotz L Cable (4.5M)', 'Wires', 'QTR', 1),
  ('WQ003', 'WQ003', 'Klotz Green Cable', 'Wires', 'QTR', 1),
  ('WQ004', 'WQ004', 'Red/Black Double L Cable', 'Wires', 'QTR', 2),
  ('WQ005', 'WQ005', 'D''Addario Cable', 'Wires', 'QTR', 1),
  ('WQ006', 'WQ006', 'Sunrise', 'Wires', 'QTR', 1),
  ('WP001', 'WP001', 'Uk 3 Pin', 'Wires', 'Power', 8),
  ('WP002', 'WP002', 'Us 2 Pin', 'Wires', 'Power', 7),
  ('WP003', 'WP003', 'Yamaha PA-30 (1 In Misc Box, 1 With Mixer)', 'Wires', 'Power', 2),
  ('WP004', 'WP004', 'Yamaha PA-20 (In Misc Box)', 'Wires', 'Power', 1),
  ('WP005', 'WP005', 'Yamaha PA-10 (In Misc Box)', 'Wires', 'Power', 1),
  ('WP006', 'WP006', 'Ammoon Mixer Adapter (With Mixer)', 'Wires', 'Power', 1),
  ('WP007', 'WP007', 'Power Adapter Bar (5 Outlets)', 'Wires', 'Power', 4),
  ('WP008', 'WP008', 'Power Cable Reel', 'Wires', 'Power', 4),
  ('ITEM-029', '', 'Blue Female Xlr To 1/4 Inch', 'Wires', 'Adaptors', 1),
  ('ITEM-030', '', 'Yellow Female Xlr To 1/4 Inch', 'Wires', 'Adaptors', 1),
  ('ITEM-031', '', 'Black Female Xlr To 1/4 Inch', 'Wires', 'Adaptors', 1),
  ('WS001', 'WS001', 'Snake Cable', 'Wires', 'Snake', 0),
  ('SA001', 'SA001', 'Mackie Thump 12A', 'Speakers', 'Active', 2),
  ('SA002', 'SA002', 'Studiomaster VPX 10 Speakers (Active)', 'Speakers', 'Active', 2),
  ('SA003', 'SA003', 'Yamaha Dbr 10 (Active)', 'Speakers', 'Active', 0),
  ('SP001', 'SP001', 'Speaker System 400S', 'Speakers', 'Passive', 4),
  ('-', '-', 'Harmon Kardon Speaker (Given By Jun)', 'Speakers', 'Recreational', 1),
  ('MIC-D001', 'MIC-D001', 'Shure SM58', 'Microphones', 'Dynamic', 4),
  ('MIC-D002', 'MIC-D002', 'AKG D770', 'Microphones', 'Dynamic', 2),
  ('MIC-D003', 'MIC-D003', 'Sennheiser E840S', 'Microphones', '', 1),
  ('-', '-', 'Sennheiser Eoava', 'Microphones', '', 1),
  ('MIC-D004', 'MIC-D004', 'Akg D112 Drum Mic', 'Microphones', '', 1),
  ('MIC-C001', 'MIC-C001', 'Audio-Technica AT2020', 'Microphones', 'Condenser', 1),
  ('MIC-C002', 'MIC-C002', 'Samson Co2 Condenser Mics', 'Microphones', 'Condenser', 4),
  ('MIC-C003', 'MIC-C003', 'Akg C430 Mini Condenser Mics', 'Microphones', 'Condenser', 2),
  ('-', '-', 'Akg Sr 40 Receiver For Wireless Mic', 'Microphones', 'Accessories', 1),
  ('MIC-A001', 'MIC-A001', 'Mic Grille', 'Microphones', 'Accessories', 1),
  ('MIC-A002', 'MIC-A002', 'Mic Clips', 'Microphones', 'Accessories', 3),
  ('MIC-A003', 'MIC-A003', 'Assorted Spare Parts', 'Microphones', 'Accessories', 0),
  ('MIC-A004', 'MIC-A004', 'Wharfedale Pro', 'Microphones', 'Accessories', 1),
  ('MIC-A005', 'MIC-A005', 'Pop Filter', 'Microphones', 'Accessories', 1),
  ('UKU001', 'UKU001', 'Prillante Basswood LT27 Ukulele', 'Instrument', 'Ukulele', 1),
  ('UKU002', 'UKU002', 'anuenue Papa I Soprano-Electric', 'Instrument', 'Ukulele', 1),
  ('UKU003', 'UKU003', 'Kala Satin Mahogany Tenor Ukulele', 'Instrument', 'Ukulele', 1),
  ('UKU004', 'UKU004', 'Kala Travel Tenor Ukulele', 'Instrument', 'Ukulele', 1),
  ('UKA001', 'UKA001', 'Ukulele Soft Case', 'Instrument', 'Ukulele Accessories', 4),
  ('CG001', 'CG001', 'Maestro Alto', 'Instrument', 'Classical Guitars', 4),
  ('CG002', 'CG002', 'Maestro Bass', 'Instrument', 'Classical Guitars', 1),
  ('CG003', 'CG003', 'Suzuki', 'Instrument', 'Classical Guitars', 1),
  ('CG004', 'CG004', 'Yamaha CG112MC', 'Instrument', 'Classical Guitars', 3),
  ('CG005', 'CG005', 'Yukinobu Chai', 'Instrument', 'Classical Guitars', 1),
  ('CG006', 'CG006', 'Synchronium Classical', 'Instrument', 'Classical Guitars', 1),
  ('CG007', 'CG007', 'Yamaha C70', 'Instrument', 'Classical Guitars', 1),
  ('CG008', 'CG008', 'Yamaha C40', 'Instrument', 'Classical Guitars', 1),
  ('AG001', 'AG001', 'Lag Tramontane T66DCE Acoustic Guitar', 'Instrument', 'Acoustic Guitars', 1),
  ('AG002', 'AG002', 'Cort Earth 70E', 'Instrument', 'Acoustic Guitars', 1),
  ('AG003', 'AG003', 'Cort CE300', 'Instrument', 'Acoustic Guitar', 1),
  ('AG004', 'AG004', 'Ibanez AEQ2T', 'Instrument', 'Acoustic Guitars', 1),
  ('SG001', 'SG001', 'Niibori', 'Instrument', 'Soprano Guitars', 1),
  ('EG001', 'EG001', 'Washburn Nuno Bettencourt Signature N1 Electric Guitar', 'Instrument', 'Electric Guitars', 1),
  ('EG002', 'EG002', 'Epiphone', 'Instrument', 'Electric Guitars', 0),
  ('EG003', 'EG003', 'Gio Ibanez Guitar', 'Instrument', 'Electric Guitars', 1),
  ('EG004', 'EG004', 'Squier Stratocoaster Classic Vibe 70s', 'Instrument', 'Electric Guitars', 1),
  ('EG005', 'EG005', 'Aria-STG Series (Blue)', 'Instrument', 'Electric Guitars', 1),
  ('EG006', 'EG006', 'Squier Sunburst (Brown) Bullet Strat', 'Instrument', 'Electric Guitars', 1),
  ('EG007', 'EG007', 'Squier Transparent Blue Affinity Strat', 'Instrument', 'Electric Guitars', 1),
  ('EB001', 'EB001', 'Gio Ibanez Bass', 'Instrument', 'Electric Bass', 1),
  ('EB002', 'EB002', 'Fender Player Precision Bass (Tidepool)', 'Instrument', 'Electric Bass', 1),
  ('EB003', 'EB003', 'Fender Squier MB-4 Skull and Crossbone', 'Instrument', 'Electric Bass', 1),
  ('ITEM-080', '', 'Elixir 16539 Nanoweb 80/20 Bronze Light Acoustic Guitar Strings', 'Accessories', 'Guitar Accessories', 0),
  ('ITEM-081', '', 'Elixir 14677 Nanoweb Stainless Steel Electric Bass Strings', 'Accessories', 'Guitar Accessories', 2),
  ('ITEM-082', '', 'Elixir 19052 Optiweb Electric Guitar Strings', 'Accessories', 'Guitar Accessories', 10),
  ('GBA001', 'GBA001', 'Maestro Bag', 'Instrument', 'Guitar/Bass Accessories', 5),
  ('GBA002', 'GBA002', 'Sx Bag', 'Instrument', 'Guitar/Bass Accessories', 0),
  ('GBA003', 'GBA003', 'Ibanez Bag', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('GBA004', 'GBA004', 'Pedalboard Bag', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('GBA005', 'GBA005', 'Boss Ab-2 2-Way Selector', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('GBA006', 'GBA006', 'Yukinoba Chai Bag', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('GBA007', 'GBA007', 'Rockbag by Warwick', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('GBA008', 'GBA008', 'Fender Bag', 'Instrument', 'Guitar/Bass Accessories', 3),
  ('GBA009', 'GBA009', 'Guitar Bag', 'Instrument', 'Guitar/Bass Accessories', 4),
  ('GBA010', 'GBA010', 'Niibori Hard Case', 'Instrument', 'Guitar/Bass Accessories', 1),
  ('ITEM-093', '', 'Kyser KG6BCA Quick Change Capo, Black Chrome', 'Other', 'Guitar/Bass Accessories', 1),
  ('KEY001', 'KEY001', 'Korg Sv1-88 Stage Piano', 'Instrument', 'Keyboards', 1),
  ('KEY002', 'KEY002', 'Casio Keyboard Ctk-3200', 'Instrument', 'Keyboards', 4),
  ('KEY-A001', 'KEY-A001', 'Keyboard Damper', 'Instrument', 'Keyboards Accessories', 3),
  ('DRM001', 'DRM001', 'Mapex Bass Drum', 'Instrument', 'Drum Kit', 1),
  ('DRM002', 'DRM002', 'Mapex Floor Tom 14"', 'Instrument', 'Drum Kit', 1),
  ('DRM003', 'DRM003', 'Mapex Rack Tom', 'Instrument', 'Drum Kit', 2),
  ('DRM004', 'DRM004', 'Mapex Snare', 'Instrument', 'Drum Kit', 1),
  ('DRM005', 'DRM005', 'Meinl Hihats', 'Instrument', 'Drum Kit', 2),
  ('DRM006', 'DRM006', 'Sabian Aax Freq Crash 18''', 'Instrument', 'Drum Kit', 1),
  ('DRM007', 'DRM007', 'Meinl Byzance 18" Jazz Thin Crash', 'Instrument', 'Drum Kit', 1),
  ('DRM008', 'DRM008', 'Zildjian Zxt Medium Ride 20"', 'Instrument', 'Drum Kit', 1),
  ('DRM009', 'DRM009', 'Hihat Stand', 'Instrument', 'Drum Kit', 1),
  ('DRM010', 'DRM010', 'Cymbal Stands', 'Instrument', 'Drum Kit', 3),
  ('DRM011', 'DRM011', 'Drummer Stool', 'Instrument', 'Drum Kit', 3),
  ('ITEM-108', '', '22" Remo Ambassador Bass Drum Head', 'Instrument', 'Drum Kit', 2),
  ('ITEM-109', '', 'Zildjian Zxt Medium Thin Crash 16"', 'Instrument', 'Drum Kit', 0),
  ('ITEM-110', '', 'Paiste 14" 201 Hihat Pair', 'Instrument', 'Drum Kit', 2),
  ('ITEM-111', '', 'Mapex Crash Ride 18"', 'Instrument', 'Drum Kit', 1),
  ('ITEM-112', '', 'Zildjian Zxt 14" Solid Hihat Pair', 'Instrument', 'Drum Kit', 2),
  ('ITEM-113', '', 'Zildjian Zxt 10" Flash Splash', 'Instrument', 'Drum Kit', 1),
  ('ITEM-114', '', 'Mapex Small Tom Head', 'Instrument', 'Drum Kit', 2),
  ('ITEM-115', '', 'Mapex Medium Tom Head', 'Instrument', 'Drum Kit', 2),
  ('ITEM-116', '', 'Mapex Snare Head', 'Instrument', 'Drum Kit', 1),
  ('ITEM-117', '', 'Remo Weatherking Emperor Bass Drum Head', 'Instrument', 'Drum Kit', 0),
  ('ITEM-118', '', 'Remo Weatherking Emperor Snare Head', 'Instrument', 'Drum Kit', 0),
  ('ITEM-119', '', 'Remo Weatherking Emperor Small Tom? Head', 'Instrument', 'Drum Kit', 0),
  ('ITEM-120', '', 'Remo Gretsch Snare Head', 'Instrument', 'Drum Kit', 1),
  ('ITEM-121', '', 'Evans Snare', 'Instrument', 'Drum Kit', 1),
  ('ITEM-122', '', 'Evans 14"  Snare Head', 'Instrument', 'Drum Kit', 1),
  ('ITEM-123', '', 'Evans Bass Drum Head', 'Instrument', 'Drum Kit', 1),
  ('ITEM-124', '', 'Cymbal Felt', 'Instrument', 'Drum Accessory', 4),
  ('ITEM-125', '', 'Drum Sticks', 'Instrument', 'Drum Accessory', 0),
  ('ITEM-126', '', 'Drum Key', 'Instrument', 'Drum Accessory', 2),
  ('ITEM-127', '', 'Drum Carpet', 'Instrument', 'Drum Accessory', 1),
  ('ITEM-128', '', 'Drum Shield', 'Instrument', 'Drum Accessory', 0),
  ('ITEM-129', '', 'Iron Cobra Case', 'Instrument', '', 1),
  ('ITEM-130', '', 'SB300 Wire Brush', 'Instrument', 'Drum Accessory/Sticks', 2),
  ('PER001', 'PER001', 'Cajon W/Bag', 'Instrument', 'Percussion', 2),
  ('-', '-', 'Kazoo', 'Instrument', 'Percussion', 1),
  ('PER002', 'PER002', 'Suzuki Triangle', 'Instrument', 'Percussion', 1),
  ('PER003', 'PER003', 'Lp Tambourine', 'Instrument', 'Percussion', 1),
  ('AG001', 'AG001', 'Laney LX12', 'Amplifiers', 'Guitar Amp', 1),
  ('AG002', 'AG002', 'Vox VT 40+', 'Amplifiers', 'Guitar Amp', 1),
  ('AG003', 'AG003', 'Vox AC10C1', 'Amplifiers', 'Guitar Amp', 1),
  ('AG004', 'AG004', 'Boss Katana 100', 'Amplifiers', 'Guitar Amp', 1),
  ('AG005', 'AG005', 'Marshall MG50FX', 'Amplifiers', 'Guitar Amp', 1),
  ('-', '-', 'Marshall Mg50Fx Footswitch', 'Other', '', 0),
  ('AB001', 'AB001', 'Ampeg BA115 Bass Amp', 'Amplifiers', 'Bass Amp', 1),
  ('AB002', 'AB002', 'Laney RB8 Bass Amp', 'Amplifiers', 'Bass Amp', 1),
  ('ITEM-143', '', 'Yamaha Mg10Xuf', 'Mixers', '10 Channel Mixer', 1),
  ('ITEM-144', '', 'Yamaha Mg124 Cx', 'Mixers', '12 Channel Mixer', 1),
  ('ITEM-145', '', 'Yamaha Mg124 C', 'Mixers', '12 Channel Mixer', 1),
  ('ITEM-146', '', 'Yamaha Mg206 C', 'Mixers', '20 Channel Mixer', 1),
  ('ITEM-147', '', 'Mackie Profx12', 'Mixers', '', 1),
  ('ITEM-148', '', 'Soundcraft Signature 10 Eu Mixing System', 'Mixers', '', 1),
  ('ITEM-149', '', 'Ammoon Mixer', 'Mixers', '', 1),
  ('ITEM-150', '', 'Yamaha Stagepas 400 Bt (Mixer)', 'Mixers', 'Main', 1),
  ('DI001', 'DI001', 'Alctron D1100 Active Di', 'Auxillary Equipment', 'DI Boxes', 2),
  ('DI002', 'DI002', 'Whirlwind Edb1 Passive Di', 'Auxillary Equipment', 'DI Boxes', 3),
  ('DI003', 'DI003', 'Klotz D10 Passive Di', 'Auxillary Equipment', 'DI Boxes', 2),
  ('AI001', 'AI001', 'Tascam Us 800 Audio/Midi Interface', 'Auxillary Equipment', 'Audio Interfaces', 1),
  ('AI002', 'AI002', 'Presonus Audio Interface Box', 'Auxillary Equipment', 'Audio Interfaces', 1),
  ('AI003', 'AI003', 'Scarlett 8I6 A1', 'Auxillary Equipment', 'Audio Interfaces', 1),
  ('STD001', 'STD001', 'Music Score Stands', 'Auxillary Equipment', 'Stands', 2),
  ('STD002', 'STD002', 'Foldable Scorestands', 'Auxillary Equipment', 'Stands', 5),
  ('STD003', 'STD003', 'Speaker Stands', 'Auxillary Equipment', 'Stands', 0),
  ('STD004', 'STD004', 'Mic Stands', 'Auxillary Equipment', 'Stands', 0),
  ('STD005', 'STD005', 'Nomad Table Mic Stand', 'Auxillary Equipment', 'Stands', 1),
  ('STD006', 'STD006', 'Guitar Stand', 'Auxillary Equipment', 'Stands', 0),
  ('STD007', 'STD007', 'Guitar Rack (Fits 8)', 'Auxillary Equipment', 'Stands', 1),
  ('STD008', 'STD008', 'Keyboard X Stand', 'Auxillary Equipment', 'Stands', 1),
  ('STD009', 'STD009', 'Guitar Amp Stand', 'Auxillary Equipment', 'Stands', 2),
  ('STD010', 'STD010', 'Foot Support Stands', 'Auxillary Equipment', 'Stands', 7),
  ('HP001', 'HP001', 'Sony MDR-7506 1/4''''', 'Auxillary Equipment', 'Headphones', 1),
  ('HP002', 'HP002', 'Audio Technica ATH-M50x Professional Monitor Headphones', 'Auxillary Equipment', 'Headphones', 1),
  ('MISC001', 'MISC001', 'Black Acting Blocks', 'Misc', '', 5),
  ('MISC002', 'MISC002', 'Circular Stool', 'Furniture', '', 6),
  ('MISC003', 'MISC003', 'High Tables', 'Furniture', '', 4),
  ('MISC005', 'MISC005', 'Ikea High Stool', 'Furniture', '', 2),
  ('MISC006', 'MISC006', 'Short Table', 'Furniture', '', 1),
  ('MISC007', 'MISC007', 'Black Out Curtains', 'Misc', '', 5),
  ('MISC008', 'MISC008', 'Camera Tripod', 'Misc', '', 1),
  ('MISC009', 'MISC009', 'Assorted Arts And Craft Supplies/Materials', 'Misc', '', 0),
  ('MISC010', 'MISC010', 'Foam Sound Isolation Panels (Tall)', 'Misc', '', 2),
  ('MISC011', 'MISC011', 'Foam Sound Isolation Panel', 'Misc', '', 1)
on conflict (id) do update set
  barcode = excluded.barcode,
  name = excluded.name,
  category = excluded.category,
  subtype = excluded.subtype,
  working_qty = excluded.working_qty;
