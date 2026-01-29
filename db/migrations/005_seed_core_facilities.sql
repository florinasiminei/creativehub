-- Seed core facilities list (non-destructive: inserts missing rows only)
INSERT INTO facilities (name)
SELECT v.name
FROM (
  VALUES
    ('Wi-Fi'),
    ('Parcare'),
    ('Bucătărie / Chicinetă'),
    ('Aer condiționat'),
    ('Încălzire'),
    ('TV / Smart TV'),
    ('Mașină de spălat rufe'),
    ('Uscător de rufe'),
    ('Terasă / Balcon'),
    ('Grătar / BBQ'),
    ('Șemineu / Sobă'),
    ('Piscină'),
    ('Ciubăr / Jacuzzi'),
    ('Saună'),
    ('Pet friendly'),
    ('Mic dejun inclus')
) AS v(name)
WHERE NOT EXISTS (
  SELECT 1 FROM facilities f WHERE f.name = v.name
);
