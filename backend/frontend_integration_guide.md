# Tarix Ticketer: Frontend Integration Guide (Booking Flow)

This guide outlines the steps to connect the React frontend to the Tarix Ticketer backend for the complete booking flow.

## 1. Authentication & Security
All protected routes (Admin/Ticketer actions) require a JWT token in the `Authorization` header.
- Use the `api` axios instance in `src/shared/api.ts`.
- Ensure tokens are stored in `localStorage`.

## 2. API Endpoints for Booking

### Passenger Management
| Action | Endpoint | Method | Note |
| :--- | :--- | :--- | :--- |
| **Lookup Passenger** | `/auth/passenger/:loginId` | `GET` | Fetch recurring user details using their unique Login ID. |
| **Register Passenger** | `/auth/passenger` | `POST` | Create a new registered passenger and generate a Login ID. |

### Trip & Booking
| Action | Endpoint | Method | Note |
| :--- | :--- | :--- | :--- |
| **Search Trips** | `/trips?from=X&to=Y&date=Z` | `GET` | Fetch available trips for a specific route. |
| **Get Trip Details** | `/trips/:id` | `GET` | Get full details including bus info and available seats. |
| **Create Booking** | `/bookings` | `POST` | Submit final booking with passenger manifest and payment info. |

---

## 3. Implementation Workflow

### Step 1: User Identification (`UserIdentification.tsx`)
When a user begins a booking, they should enter their **Login ID**.
- Call `GET /api/auth/passenger/:loginId`.
- **Success**: Store the passenger details in `useBookingStore` and navigate to **Seat Selection**.
- **Failure**: Show "Login ID not found" and encourage them to click "New User".

### Step 2: Passenger Registration (`PassengerDetails.tsx`)
For new users, collect their full profile (Name, DOB, Next of Kin, etc.).
- Call `POST /api/auth/passenger` with the form data.
- **Success**: The backend returns a `RegisteredPassenger` object with a `loginId`.
- **UI Action**: Show a success modal displaying their new **Login ID** so they can save it for future use.

### Step 3: Manifest Preparation
The `POST /bookings` endpoint expects an array of passengers:
```json
{
  "tripId": "uuid",
  "seats": 2,
  "passengers": [
    { "fullName": "John Doe", "seatNumber": "1A", "phone": "+234..." },
    ...
  ],
  "totalPrice": 30000
}
```
If using a registered passenger, populate the first entry in this array with their profile info.

---

## 4. State Management (Zustand)
We use `useBookingStore` to sync data across the wizard:
- `selectedTrip`: The trip the user is booking.
- `registeredPassenger`: The profile fetched/created in steps 1-2.
- `bookingPassengers`: The manifest being built for the final request.

## 5. Troubleshooting
- **CORS Error**: Check if the frontend port is whitelisted in `backend/src/server.js`.
- **Prisma Error**: If adding a passenger fails, check the `backend` terminal for unique constraint violations (e.g., Email or Phone already exists).

---

## 6. Fleet Management Integration

### Multipart Uploads
The `POST /api/fleet` endpoint handles asset registration. Since it includes images and PDFs, the frontend MUST use `FormData`:
- **Images**: Sent to Cloudinary via the backend.
- **Documents**: Stored in a secure `uploads/documents/` folder on the server.

### Secure Document Access
Documents are not served as static assets. They must be requested via `GET /api/fleet/documents/:filename`.
- **Authorization**: The request must include the `Admin` JWT token.
- **Frontend Action**: Use `window.open` with a temporary authenticated proxy or fetch with `blob` response type to trigger downloads safely.

### Performance Analytics
The `GET /api/fleet/performance` route provides data for the "Performance Overview" chart.
- It returns `dailyStats` as an array representing Mon-Sun activity.
- Utilization is calculated as a percentage based on booked seats vs. total capacity.
