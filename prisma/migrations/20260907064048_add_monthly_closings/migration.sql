CREATE TABLE public.monthly_closings (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL,
  month DATE NOT NULL,
  opening_balance DECIMAL(15, 2) NOT NULL,
  total_income DECIMAL(15, 2) NOT NULL,
  total_expense DECIMAL(15, 2) NOT NULL,
  closing_balance DECIMAL(15, 2) NOT NULL,
  closed_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT monthly_closings_owner_id_month_key UNIQUE (owner_id, month)
);

CREATE INDEX monthly_closings_owner_id_month_idx
  ON public.monthly_closings (owner_id, month);

REVOKE ALL ON TABLE public.monthly_closings FROM anon, authenticated;
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;