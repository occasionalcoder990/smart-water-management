-- Smart Water Management System Database Schema

-- Drop existing tables and types if they exist
DROP TABLE IF EXISTS usage_records CASCADE;
DROP TABLE IF EXISTS deployments CASCADE;
DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS baselines CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS zone_type CASCADE;
DROP TYPE IF EXISTS zone_status CASCADE;
DROP TYPE IF EXISTS deployment_status CASCADE;
DROP TYPE IF EXISTS recommendation_type CASCADE;
DROP TYPE IF EXISTS recommendation_status CASCADE;

-- Create ENUM types
CREATE TYPE zone_type AS ENUM ('kitchen', 'bathroom', 'garden', 'laundry', 'other');
CREATE TYPE zone_status AS ENUM ('idle', 'active', 'error');
CREATE TYPE deployment_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
CREATE TYPE recommendation_type AS ENUM ('volume_optimization', 'schedule_optimization', 'leak_detection', 'seasonal_adjustment');
CREATE TYPE recommendation_status AS ENUM ('active', 'accepted', 'dismissed', 'expired');

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Zones table
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  type zone_type NOT NULL,
  max_volume INTEGER DEFAULT 1000,
  status zone_status DEFAULT 'idle',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_user_id ON zones(user_id);

-- Deployments table
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  requested_liters INTEGER NOT NULL CHECK (requested_liters >= 1 AND requested_liters <= 1000),
  deployed_liters DECIMAL(10, 2) DEFAULT 0,
  status deployment_status DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

CREATE INDEX idx_deployments_zone_id ON deployments(zone_id);
CREATE INDEX idx_deployments_started_at ON deployments(started_at);
CREATE INDEX idx_deployments_status ON deployments(status);

-- Usage records table
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  liters DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cost DECIMAL(10, 2)
);

CREATE INDEX idx_usage_records_zone_id ON usage_records(zone_id);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX idx_usage_records_zone_timestamp ON usage_records(zone_id, timestamp DESC);

-- Recommendations table
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type recommendation_type NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  suggested_action JSONB NOT NULL,
  estimated_savings DECIMAL(10, 2),
  status recommendation_status DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);

-- Baselines table
CREATE TABLE baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  average_daily_liters DECIMAL(10, 2) NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

CREATE INDEX idx_baselines_user_id ON baselines(user_id);
CREATE INDEX idx_baselines_zone_id ON baselines(zone_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on zones
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
