-- JB Creations Database Schema for Supabase
-- Run these SQL commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    images JSONB NOT NULL, -- Array of image URLs and metadata
    frame_size VARCHAR(50),
    frame_type VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    special_instructions TEXT,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, cancelled
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_status_history table (optional - track status changes)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100), -- admin name or 'system'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security policies

-- Customers: Users can read their own data
CREATE POLICY "Users can read own customer data" ON customers
    FOR SELECT USING (auth.uid()::text = id::text);

-- Orders: Users can read their own orders
CREATE POLICY "Users can read own orders" ON orders
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth.uid()::text = id::text
        )
    );

-- Orders: Anyone can insert orders (for guest checkout)
CREATE POLICY "Anyone can create orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Admin access (you'll need to set up admin users separately)
-- For now, we'll allow authenticated users to read all data for admin panel
CREATE POLICY "Admin can read all orders" ON orders
    FOR SELECT USING (
        auth.jwt()->>'role' = 'admin' OR
        auth.jwt()->>'email' = 'your-admin-email@gmail.com'
    );

CREATE POLICY "Admin can update orders" ON orders
    FOR UPDATE USING (
        auth.jwt()->>'role' = 'admin' OR
        auth.jwt()->>'email' = 'your-admin-email@gmail.com'
    );

-- Storage policy for order images
CREATE POLICY "Anyone can upload order images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'order-images');

CREATE POLICY "Anyone can view order images" ON storage.objects
    FOR SELECT USING (bucket_id = 'order-images');

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO customers (name, email, phone, address) VALUES
-- ('John Doe', 'john@example.com', '+1234567890', '123 Main St, City, Country');

-- Success message
SELECT 'JB Creations database schema created successfully! 🎉' as message;