
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  barcode VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255),
  brand VARCHAR(255),
  size VARCHAR(50),
  color VARCHAR(50),
  purchase_price NUMERIC(10, 2) NOT NULL,
  sale_price NUMERIC(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales (
  id VARCHAR(255) PRIMARY KEY,
  bill_number VARCHAR(255) UNIQUE NOT NULL,
  customer_id VARCHAR(255) REFERENCES customers(id),
  subtotal NUMERIC(10, 2) NOT NULL,
  discount NUMERIC(10, 2) NOT NULL,
  discount_type VARCHAR(50) NOT NULL,
  discount_value NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount_received NUMERIC(10, 2) NOT NULL,
  change_amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
  id VARCHAR(255) PRIMARY KEY,
  sale_id VARCHAR(255) REFERENCES sales(id),
  product_id VARCHAR(255) REFERENCES products(id),
  qty INTEGER NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  is_returned BOOLEAN DEFAULT FALSE,
  is_exchanged BOOLEAN DEFAULT FALSE
);

CREATE TABLE exchanges (
  id VARCHAR(255) PRIMARY KEY,
  old_sale_item_id VARCHAR(255) REFERENCES sale_items(id),
  new_product_id VARCHAR(255) REFERENCES products(id),
  difference_amount NUMERIC(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE returns (
  id VARCHAR(255) PRIMARY KEY,
  sale_item_id VARCHAR(255) REFERENCES sale_items(id),
  refund_amount NUMERIC(10, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  refund_method VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
  id VARCHAR(255) PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES products(id),
  movement_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  shop_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(255),
  logo TEXT,
  sale_footer TEXT,
  return_footer TEXT,
  exchange_footer TEXT,
  exchange_policy TEXT,
  show_policy_toggle BOOLEAN DEFAULT TRUE,
  exchange_days INTEGER DEFAULT 3,
  return_days INTEGER DEFAULT 3,
  ntn VARCHAR(255),
  receipt_header TEXT,
  receipt_footer TEXT,
  owner_name VARCHAR(255)
);
