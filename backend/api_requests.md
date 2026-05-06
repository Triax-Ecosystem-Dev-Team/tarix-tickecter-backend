# API Testing Guide (Sample Requests)

Yes, the backend logic is complete for Admin, Ticketer, and Passenger roles. 

To test these endpoints, make sure you have your database running, and you've started the server using `npm run dev`.

Here are standard `curl` commands you can copy and paste into your terminal. They cover the main workflows.

> [!TIP]
> **Authentication Token**: Many of these routes are private. After you run the login or register requests, you will receive a `"token": "ey..."` in the response. Replace `<YOUR_JWT_TOKEN>` in the commands below with that actual token string.

## 1. Authentication

### Login (Works for all roles)
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tarix.com",
    "password": "password123"
  }'
```

---

## 2. Dispatch & Live Monitoring (Admin & Ticketer)

### Get Live Fleet Status
*Returns real-time occupancy, location, and professional bus naming (Manufacturer + Model).*
```bash
curl -X GET http://localhost:5000/api/dispatch/fleet-status \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### Get Daily Sales Overview
*Aggregates today's revenue and ticket counts grouped by payment method (Cash, Transfer, Card).*
```bash
curl -X GET http://localhost:5000/api/dispatch/sales-stats \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"
```

### Update Live Trip Status
*Manually transition a trip through its lifecycle.*
*Enums: Scheduled, Active, InTransit, Completed, Delayed, Cancelled*
```bash
curl -X PATCH http://localhost:5000/api/dispatch/trips/<TRIP_ID>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "status": "InTransit"
  }'
```

---

## 3. Trips Management (Admin & General)

### Get All Trips (Public - Supports Pagination and Search)
```bash
# Basic request (Shows Scheduled, Active, etc.)
curl -X GET http://localhost:5000/api/trips

# With Search Filters
curl -X GET "http://localhost:5000/api/trips?from=Lagos&to=Abuja&passengers=2"
```

---

## 4. Bookings (Passenger, Ticketer, Admin)

### Create a Booking
*PaymentMethod: Cash, Transfer, Card*
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -d '{
    "tripId": "<TRIP_ID>",
    "seats": 2,
    "paymentMethod": "Transfer",
    "totalPrice": 30000
  }'
```

---

## 5. Fleet Management (Admin Only)

### Register New Bus Asset
```bash
curl -X POST http://localhost:5000/api/fleet \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "registrationNumber=BUS-005" \
  -F "manufacturer=Toyota" \
  -F "model=Coaster" \
  -F "nickname=Swift Runner" \
  -F "totalCapacity=40" \
  -F "transmissionType=Manual" \
  -F "maintenanceStatus=Excellent"
```

---

## 6. User Account (All Registered Users)

### Update Profile
*Note: This endpoint now requires `multipart/form-data` to support avatar uploads.*
```bash
# Update name and upload a new avatar image
curl -X PATCH http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -F "name=John Doe Updated" \
  -F "avatar=@/path/to/your/photo.jpg"
```
