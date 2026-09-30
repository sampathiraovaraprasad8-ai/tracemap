-- TraceMap Database Architecture & Seed Script
-- Compatible with PostgreSQL 13+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS services;

-- 1. Services Table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'healthy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Connections Table
CREATE TABLE connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_service VARCHAR(255) NOT NULL,
    target_service VARCHAR(255) NOT NULL,
    latency_ms INT DEFAULT 50,
    is_circular BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_connection UNIQUE (source_service, target_service)
);

-- 3. Seed Microservices Data
INSERT INTO services (name, status) VALUES
    ('API Gateway', 'healthy'),
    ('Auth Service', 'healthy'),
    ('Cart Service', 'warning'),
    ('Payment Service', 'critical'),
    ('Inventory Service', 'healthy'),
    ('Database Service', 'healthy'),
    ('Notification Service', 'healthy')
ON CONFLICT (name) DO NOTHING;

-- 4. Seed Connections with Intentionally Introduced Circular Dependency Loop:
-- API Gateway -> Auth Service -> Database Service
-- API Gateway -> Cart Service -> Payment Service -> Inventory Service -> Cart Service (CIRCULAR LOOP!)
-- Payment Service -> Notification Service

INSERT INTO connections (source_service, target_service, latency_ms, is_circular) VALUES
    ('API Gateway', 'Auth Service', 24, FALSE),
    ('Auth Service', 'Database Service', 15, FALSE),
    ('API Gateway', 'Cart Service', 45, FALSE),
    ('Cart Service', 'Payment Service', 180, TRUE),
    ('Payment Service', 'Inventory Service', 210, TRUE),
    ('Inventory Service', 'Cart Service', 195, TRUE),
    ('Payment Service', 'Notification Service', 65, FALSE)
ON CONFLICT (source_service, target_service) DO UPDATE 
SET latency_ms = EXCLUDED.latency_ms, is_circular = EXCLUDED.is_circular;
