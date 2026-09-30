export const SAMPLE_CURL_TRACES = {
  circularLoop: `# cURL Traces containing Circular Dependency Loop
curl -X POST http://cart-service:8080/checkout \\
  -H "Authorization: Bearer secret_token_abc123" \\
  -H "X-Source-Service: API Gateway" \\
  -d '{"cartId": 9942, "user": "alice"}'

curl -X POST http://payment-service:8080/process \\
  -H "Authorization: Bearer secret_token_xyz987" \\
  -H "X-Source-Service: Cart Service" \\
  -d '{"amount": 149.99, "currency": "USD"}'

curl -X GET http://inventory-service:8080/stock/check \\
  -H "Cookie: session_id=sess_7761928" \\
  -H "X-Source-Service: Payment Service" \\
  -d '{"sku": "LAPTOP-PRO-15"}'

# Circular call returning back to Cart Service!
Cart Service -> Payment Service
Payment Service -> Inventory Service
Inventory Service -> Cart Service`,

  swarmArchitecture: `# Microservice Swarm Architecture Trace
curl -X GET http://auth-service:8080/v1/auth -H "Authorization: Bearer token_98765" -H "X-Source-Service: API Gateway"
curl -X POST http://database-service:5432/query -H "X-Source-Service: Auth Service" -d '{"query": "SELECT * FROM users"}'
curl -X POST http://payment-service:8080/charge -H "X-Source-Service: API Gateway" -d '{"amount": 99.99}'
curl -X POST http://notification-service:8080/send -H "X-Source-Service: Payment Service" -d '{"email": "user@test.com"}'

API Gateway -> Auth Service
Auth Service -> Database Service
API Gateway -> Payment Service
Payment Service -> Notification Service`,

  newServiceIngest: `# Paste a new trace to extend graph dynamically
curl -X POST http://analytics-service:9090/event \\
  -H "Authorization: Bearer super_secret_analytics_token" \\
  -H "X-Source-Service: API Gateway" \\
  -d '{"event": "page_view", "metadata": "sensitivedata"}'

API Gateway -> Analytics Service
Analytics Service -> Database Service`,

  flipkartSwarm: `# Flipkart E-Commerce Microservice Network Trace
curl -X GET http://catalog-service:8080/products/electronics -H "Authorization: Bearer fk_session_token_9981" -H "X-Source-Service: Flipkart Gateway"
curl -X POST http://cart-service:8080/items/add -H "X-Source-Service: Catalog Service" -d '{"itemId": "MOB12345", "qty": 1}'
curl -X POST http://payment-service:8080/upi/pay -H "Authorization: Bearer fk_pay_token" -H "X-Source-Service: Cart Service"
curl -X POST http://logistics-service:8080/shipment/create -H "X-Source-Service: Payment Service"
curl -X POST http://notification-service:8080/sms/send -H "X-Source-Service: Payment Service"

Flipkart Gateway -> Catalog Service
Catalog Service -> Cart Service
Cart Service -> Payment Service
Payment Service -> Logistics Service
Payment Service -> Notification Service
Logistics Service -> Notification Service`
};
