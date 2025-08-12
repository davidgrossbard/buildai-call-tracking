-- If you already created building_count column, rename it to num_buildings
ALTER TABLE companies 
RENAME COLUMN building_count TO num_buildings;