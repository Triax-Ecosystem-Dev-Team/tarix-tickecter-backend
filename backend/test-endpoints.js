const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  let adminToken, ticketerToken, userToken;
  let adminId, ticketerId, userId;
  let tripId, busId, bookingId;

  console.log('--- STARTING ENDPOINT TESTS ---');

  try {
    // 1. AUTH ENDPOINTS
    console.log('\n[1] Testing Auth Endpoints...');
    
    // Register Admin
    try {
      const adminRes = await axios.post(`${API_URL}/auth/register`, {
        name: 'Admin User',
        email: 'admin.test@tarix.com',
        password: 'password123',
        role: 'Admin'
      });
      console.log('✅ POST /auth/register (Admin) - SUCCESS');
      adminToken = adminRes.data.data.token;
      adminId = adminRes.data.data.id;
    } catch (e) {
      if(e.response && e.response.status === 400) {
        console.log('✅ POST /auth/register (Admin) - User already exists, logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
          email: 'admin.test@tarix.com',
          password: 'password123'
        });
        adminToken = loginRes.data.data.token;
      } else {
        console.error('❌ POST /auth/register (Admin) - FAILED:', e.response?.data || e.message);
      }
    }

    // Register User
    try {
      const userRes = await axios.post(`${API_URL}/auth/register`, {
        name: 'Normal User',
        email: 'user.test@tarix.com',
        password: 'password123',
        role: 'Passenger'
      });
      console.log('✅ POST /auth/register (Passenger) - SUCCESS');
      userToken = userRes.data.data.token;
      userId = userRes.data.data.id;
    } catch (e) {
      if(e.response && e.response.status === 400) {
        console.log('✅ POST /auth/register (Passenger) - User already exists, logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
          email: 'user.test@tarix.com',
          password: 'password123'
        });
        userToken = loginRes.data.data.token;
      } else {
        console.error('❌ POST /auth/register (User) - FAILED:', e.response?.data || e.message);
      }
    }

    // Test /me endpoint
    if (adminToken) {
      const meRes = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ GET /auth/me - SUCCESS:', meRes.data.data.email);
    }

    // 2. ADMIN ENDPOINTS (Ticketers & Drivers)
    console.log('\n[2] Testing Admin Endpoints...');
    if (adminToken) {
      // Create Ticketer
      try {
        const ticketerData = {
          fullName: `Ticketer Test ${Date.now()}`,
          email: `ticketer${Date.now()}@tarix.com`,
          password: 'password123',
          phone: '+2348000000000',
          idNumber: `TKT-${Date.now()}`,
          homeAddress: 'Lagos',
          station: 'Lagos',
          workShift: 'Morning',
          employmentDate: '2024-01-01',
          monthlySalary: '50000'
        };
        const ticketerRes = await axios.post(`${API_URL}/admin/ticketers`, ticketerData, {
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json' 
          }
        });
        console.log('✅ POST /admin/ticketers - SUCCESS');
      } catch (e) {
        console.error('❌ POST /admin/ticketers - FAILED:', e.response?.data || e.message);
      }

      // Create Driver
      try {
        const driverRes = await axios.post(`${API_URL}/admin/drivers`, {
          fullName: `Driver Test ${Date.now()}`,
          email: `driver${Date.now()}@tarix.com`,
          phone: '+2348000000001',
          homeAddress: 'Lagos',
          licenseNumber: `DL-${Date.now()}`,
          yearsOfExperience: 5,
          licenseIssueDate: '2020-01-01',
          licenseExpiryDate: '2030-01-01',
          employmentDate: '2024-01-01',
          monthlySalary: 80000,
          emergencyContactName: 'John Doe',
          emergencyContactPhone: '123456789'
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ POST /admin/drivers - SUCCESS');
      } catch (e) {
        console.error('❌ POST /admin/drivers - FAILED:', e.response?.data || e.message);
      }

      // Get Staff
      try {
        const staffRes = await axios.get(`${API_URL}/admin/staff`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ GET /admin/staff - SUCCESS, found:', staffRes.data.staff.length);
      } catch (e) {
        console.error('❌ GET /admin/staff - FAILED:', e.response?.data || e.message);
      }

      // Get Drivers
      try {
        const driversRes = await axios.get(`${API_URL}/admin/drivers`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ GET /admin/drivers - SUCCESS, found:', driversRes.data.drivers.length);
      } catch (e) {
        console.error('❌ GET /admin/drivers - FAILED:', e.response?.data || e.message);
      }
    }

    // 3. BUS ENDPOINTS
    console.log('\n[3] Testing Bus Endpoints...');
    if (adminToken) {
      try {
        const busRes = await axios.post(`${API_URL}/buses`, {
          registrationNumber: `BUS-${Date.now()}`,
          nickname: 'Test Bus',
          chassisNumber: `CHAS${Date.now()}`,
          engineNumber: `ENG${Date.now()}`,
          ownerName: 'Admin',
          ownerPhone: '1234567890',
          manufacturer: 'Toyota',
          model: 'Coaster',
          year: 2020,
          color: 'White',
          fuelType: 'Diesel',
          totalCapacity: 30,
          availableSeats: 30,
          maintenanceStatus: 'Excellent',
          transmissionType: 'Manual',
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ POST /buses - SUCCESS');
      } catch (e) {
        console.error('❌ POST /buses - FAILED:', e.response?.data || e.message);
      }

      try {
        const busesRes = await axios.get(`${API_URL}/buses`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ GET /buses - SUCCESS, found:', busesRes.data.buses.length);
      } catch (e) {
        console.error('❌ GET /buses - FAILED:', e.response?.data || e.message);
      }
    }

    // 4. TRIP ENDPOINTS
    console.log('\n[4] Testing Trip Endpoints...');
    try {
      if (adminToken) {
        // Create Trip
        const tripRes = await axios.post(`${API_URL}/trips`, {
          departureTerminal: 'Lagos',
          arrivalTerminal: 'Abuja',
          departureDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          departureTime: '08:00 AM',
          price: 15000,
          availableSeats: 30,
        }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ POST /trips - SUCCESS');
        tripId = tripRes.data.data?.id || tripRes.data.data?.trip?.id;
      }
    } catch (e) {
      console.error('❌ POST /trips - FAILED:', e.response?.data || e.message);
    }

    try {
      const tripsRes = await axios.get(`${API_URL}/trips`);
      const tripsArray = Array.isArray(tripsRes.data.data?.trips) ? tripsRes.data.data.trips : 
                         Array.isArray(tripsRes.data.trips) ? tripsRes.data.trips : 
                         Array.isArray(tripsRes.data.data) ? tripsRes.data.data : tripsRes.data;
      console.log('✅ GET /trips - SUCCESS, found:', tripsArray.length);
      if (!tripId && tripsArray.length > 0) tripId = tripsArray[0].id;
    } catch (e) {
      console.error('❌ GET /trips - FAILED:', e.response?.data || e.message);
    }

    if (tripId) {
      try {
        const tripById = await axios.get(`${API_URL}/trips/${tripId}`);
        console.log('✅ GET /trips/:id - SUCCESS');
      } catch (e) {
        console.error('❌ GET /trips/:id - FAILED:', e.response?.data || e.message);
      }
    }

    // 5. PASSENGER & BOOKING ENDPOINTS
    console.log('\n[5] Testing Passenger & Booking Endpoints...');
    let passengerId;
    if (userToken && tripId) {
      // Register a Passenger Profile
      try {
        const passengerRes = await axios.post(`${API_URL}/auth/passenger`, {
          title: 'Mr',
          surname: 'Tester',
          firstname: 'Passenger',
          dateOfBirth: '1990-01-01',
          occupation: 'Tester',
          state: 'Lagos',
          localGovernment: 'Ikeja',
          nationality: 'Nigerian',
          address: 'Test Address',
          phone: `080${Date.now().toString().slice(-8)}`,
          officePhone: '0800000000',
          email: `pass${Date.now()}@test.com`,
          nextOfKinName: 'NOK',
          nextOfKinPhone: '0800000001',
          nextOfKinAddress: 'NOK Address',
          nextOfKinRelationship: 'Sibling'
        });
        console.log('✅ POST /auth/passenger - SUCCESS');
        passengerId = passengerRes.data.data.id;
      } catch (e) {
        console.error('❌ POST /auth/passenger - FAILED:', e.response?.data || e.message);
      }

      // Create Booking using PassengerId
      if (passengerId) {
        try {
          const bookingRes = await axios.post(`${API_URL}/bookings`, {
            tripId: tripId,
            seats: 1,
            passengerId: passengerId,
            totalPrice: 15000,
            hasExtraBaggage: false,
            baggageFee: 0,
            paymentMethod: 'cash',
            paymentStatus: 'completed'
          }, {
            headers: { Authorization: `Bearer ${userToken}` }
          });
          console.log('✅ POST /bookings - SUCCESS');
          bookingId = bookingRes.data.data?.id || bookingRes.data.data?.booking?.id;
        } catch (e) {
          console.error('❌ POST /bookings - FAILED:', e.response?.data || e.message);
        }
      }

      try {
        const bookingsRes = await axios.get(`${API_URL}/bookings`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('✅ GET /bookings - SUCCESS, found:', bookingsRes.data.data ? bookingsRes.data.data.length : bookingsRes.data.length);
      } catch (e) {
        console.error('❌ GET /bookings - FAILED:', e.response?.data || e.message);
      }
    }

    console.log('\n--- ENDPOINT TESTS COMPLETED ---');

  } catch (err) {
    console.error('Test execution error:', err.message);
  }
}

runTests();
