-- Seed data for Naklejkomaster MVP

-- Insert starter cards based on the provided images
INSERT INTO cards (slug, name, rarity, series, description, hp, energy, abilities) VALUES
('profesor-bazyl', 'Profesor Bazyl', 'epic', 'Nauka', 'Geniusz chemii z epickim zmysłem do eksperymentów. Potrafi zmienić chaos w porządek jednym ruchem!', 420, 150, '[
  {"name": "Zielone Zamieszanie", "description": "Tworzy mgłę, która dezorientuje przeciwników"},
  {"name": "Eliksir Zmęczenia", "description": "Zmniejsza energię wroga o 30 punktów"},
  {"name": "Odwrócenie Kontroli", "description": "Przejmuje kontrolę nad jednym atakiem przeciwnika"}
]'::jsonb),

('iskierka', 'Iskierka', 'epic', 'Technologia', 'Energiczna wynalazczyni z nieposkromioną pasją do wynalazków. Jej zaawansowane gadżety to klucz do zwycięstwa!', 500, 120, '[
  {"name": "Prąd na Maxa!", "description": "Potężny atak energią elektryczną zadający 80 HP obrażeń"},
  {"name": "Oszołomienie", "description": "Paraliżuje przeciwnika na 1 turę"},
  {"name": "Turbo Ładowanie", "description": "Przywraca 50 punktów energii"}
]'::jsonb),

('grizzlytron', 'Grizzlytron', 'rare', 'Robotyka', 'Mechaniczny niedźwiedź z sercem z złota i pazurami ze stali. Chroni przyjaciół z całych swoich procesorów!', 380, 140, '[
  {"name": "Stalowy Cios", "description": "Potężny atak fizyczny zadający 60 HP"},
  {"name": "Pancerz Aktywny", "description": "Redukuje otrzymane obrażenia o 50% przez 2 tury"},
  {"name": "Naprawa Modułu", "description": "Przywraca 40 HP"}
]'::jsonb),

('robo-paczek', 'Robo-Pączek', 'common', 'Robotyka', 'Słodki robot dostarczyciel pyszności. Może nie jest bojownikiem, ale zawsze podniesie morale drużyny!', 250, 100, '[
  {"name": "Cukrowy Impuls", "description": "Dodaje 20 punktów energii sprzymierzeńcowi"},
  {"name": "Lepki Atak", "description": "Spowalnia przeciwnika"},
  {"name": "Deserowy Bonus", "description": "Przywraca 30 HP"}
]'::jsonb),

('ninja-kot', 'Ninja Kot', 'rare', 'Zwierzęta', 'Mistrzowsko skradający się kot z niezwykłą zręcznością. Jego ciche ruchy są śmiertelnie skuteczne!', 300, 160, '[
  {"name": "Ciche Cięcie", "description": "Szybki atak zadający 50 HP"},
  {"name": "Kamuflaż", "description": "Unika następnego ataku"},
  {"name": "Pazur Błyskawicy", "description": "Seria 3 ataków po 20 HP"}
]'::jsonb),

('magiczny-grzyb', 'Magiczny Grzyb', 'common', 'Natura', 'Malutki ale potężny grzyb z leśnej krainy. Jego spory mają niesamowite właściwości uzdrawiające!', 200, 110, '[
  {"name": "Chmura Spor", "description": "Osłabia atak przeciwnika o 20%"},
  {"name": "Regeneracja", "description": "Przywraca 25 HP na turę przez 2 tury"},
  {"name": "Mistyczny Impuls", "description": "Dodaje 15 energii"}
]'::jsonb),

('kapitan-burza', 'Kapitan Burza', 'epic', 'Elementy', 'Władca piorunów i burz. Jego moc nad pogodą czyni go jednym z najgroźniejszych wojowników!', 450, 180, '[
  {"name": "Uderzenie Pioruna", "description": "Masywny atak elektryczny - 90 HP"},
  {"name": "Burza Gradowa", "description": "Atakuje wszystkich przeciwników - 40 HP każdy"},
  {"name": "Naładowanie", "description": "Zwiększa moc następnego ataku o 100%"}
]'::jsonb),

('mala-alchemiczka', 'Mała Alchemiczka', 'rare', 'Magia', 'Urocza uczennica magii z talentem do tworzenia mikstur. Nie daj się zwieść jej młodemu wyglądowi!', 320, 135, '[
  {"name": "Mikstura Siły", "description": "Zwiększa atak o 30% na 3 tury"},
  {"name": "Trucizna Słabości", "description": "Zmniejsza HP przeciwnika o 5 na turę przez 4 tury"},
  {"name": "Eliksir Życia", "description": "Przywraca 60 HP"}
]'::jsonb),

('cyber-smok', 'Cyber Smok', 'epic', 'Cyberpunk', 'Futurystyczny smok z nano-technologią. Łączy w sobie starożytną moc smoków z nowoczesną technologią!', 480, 170, '[
  {"name": "Cyber Ogień", "description": "Potężny atak ogniem - 85 HP"},
  {"name": "Nano-Tarcza", "description": "Tworzy barierę absorbującą 100 HP obrażeń"},
  {"name": "Skanowanie", "description": "Pokazuje wszystkie karty przeciwnika"}
]'::jsonb),

('robo-pszczola', 'Robo-Pszczoła', 'common', 'Robotyka', 'Pracowita mechaniczna pszczółka. Może być mała, ale jej użądlenie potrafi zaskoczyć!', 220, 95, '[
  {"name": "Żądlący Atak", "description": "Szybki atak - 35 HP"},
  {"name": "Rój", "description": "Przywołuje 2 dodatkowe pszczoły na 1 turę"},
  {"name": "Pyłek Leczniczy", "description": "Leczy 20 HP"}
]'::jsonb)

ON CONFLICT (slug) DO NOTHING;

-- Insert loot tables for packs
INSERT INTO loot_tables (pack_type, table_json) VALUES
('common', '{
  "cards": [
    {"card_id": (SELECT id FROM cards WHERE slug = ''robo-paczek''), "weight": 40},
    {"card_id": (SELECT id FROM cards WHERE slug = ''magiczny-grzyb''), "weight": 35},
    {"card_id": (SELECT id FROM cards WHERE slug = ''robo-pszczola''), "weight": 25}
  ]
}'::jsonb),

('rare', '{
  "cards": [
    {"card_id": (SELECT id FROM cards WHERE slug = ''grizzlytron''), "weight": 30},
    {"card_id": (SELECT id FROM cards WHERE slug = ''ninja-kot''), "weight": 35},
    {"card_id": (SELECT id FROM cards WHERE slug = ''mala-alchemiczka''), "weight": 35}
  ]
}'::jsonb),

('epic', '{
  "cards": [
    {"card_id": (SELECT id FROM cards WHERE slug = ''profesor-bazyl''), "weight": 25},
    {"card_id": (SELECT id FROM cards WHERE slug = ''iskierka''), "weight": 30},
    {"card_id": (SELECT id FROM cards WHERE slug = ''kapitan-burza''), "weight": 25},
    {"card_id": (SELECT id FROM cards WHERE slug = ''cyber-smok''), "weight": 20}
  ]
}'::jsonb)

ON CONFLICT (pack_type) DO NOTHING;

-- Insert sample challenges
INSERT INTO challenges (title, description, periodic, rule_json, reward_type, reward_value, active) VALUES
('Poranny Start', 'Zaloguj się rano przed 10:00 i rozpocznij dzień z energią!', 'daily', '{"type": "login", "time_before": "10:00"}'::jsonb, 'pack', 'common', true),

('Aktywny Dzień', 'Rozegraj 3 gry mini-runner i zdobądź co najmniej 500 punktów w każdej!', 'daily', '{"type": "game", "game": "runner", "count": 3, "min_score": 500}'::jsonb, 'pack', 'rare', true),

('Mistrz Wymiany', 'Dokonaj wymiany karty z innym graczem przez kod QR', 'daily', '{"type": "trade", "count": 1}'::jsonb, 'pack', 'rare', true),

('Kolekcjoner Tygodnia', 'Zdobądź 5 nowych kart w ciągu tygodnia', 'weekly', '{"type": "collect", "count": 5}'::jsonb, 'pack', 'epic', true),

('Mega Wynik', 'Zdobądź 1000+ punktów w grze runner', 'weekly', '{"type": "game_score", "game": "runner", "min_score": 1000}'::jsonb, 'xp', '200', true)

ON CONFLICT DO NOTHING;
