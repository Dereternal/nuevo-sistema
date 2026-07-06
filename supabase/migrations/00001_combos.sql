-- ============================================
-- MIGRACIÓN: Sistema de Combos
-- ============================================

-- 1. Agregar campo type a stock_exits para diferenciar egresos
ALTER TABLE stock_exits ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'delivery' 
  CHECK (type IN ('delivery', 'conversion'));

-- 2. Tabla de recetas de combos
CREATE TABLE IF NOT EXISTS combos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de items que componen cada combo (receta)
CREATE TABLE IF NOT EXISTS combo_items (
  id SERIAL PRIMARY KEY,
  combo_id INTEGER REFERENCES combos(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES variants(id),
  quantity_per_combo DECIMAL(10,2) NOT NULL,
  unit_id INTEGER REFERENCES units(id)
);

-- 4. Tabla de producciones de combo (registro de cada vez que se generaron)
CREATE TABLE IF NOT EXISTS combo_productions (
  id SERIAL PRIMARY KEY,
  combo_id INTEGER REFERENCES combos(id),
  quantity_produced INTEGER NOT NULL,
  stock_exit_id INTEGER REFERENCES stock_exits(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de stock de combos (productos tipo combo generados)
CREATE TABLE IF NOT EXISTS combo_stock (
  id SERIAL PRIMARY KEY,
  combo_id INTEGER REFERENCES combos(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Políticas de seguridad RLS
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_productions ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_stock ENABLE ROW LEVEL SECURITY;

-- Permitir CRUD a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden CRUD combos"
  ON combos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden CRUD combo_items"
  ON combo_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden CRUD combo_productions"
  ON combo_productions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden CRUD combo_stock"
  ON combo_stock FOR ALL TO authenticated USING (true) WITH CHECK (true);