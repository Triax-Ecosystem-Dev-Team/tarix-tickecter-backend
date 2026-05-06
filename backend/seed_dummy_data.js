const prisma = require('./src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('--- Tarix Ticketer Database Seeder ---');

  // 1. Clean Slate (Delete in correct relational order)
  console.log('Step 1: Clearing existing data...');
  try {
    // 1. Transactions/Bookings first
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    
    // 2. Operational data
    await prisma.trip.deleteMany();
    
    // 3. Team/Fleet entities
    // Note: Driver has assignedBusId, Bus has drivers (relation)
    // We should clear Drivers then Buses to avoid FK issues on assignedBusId
    await prisma.driver.deleteMany();
    await prisma.bus.deleteMany();
    await prisma.busModel.deleteMany();
    
    // 4. Profiles and Users
    await prisma.ticketer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.passenger.deleteMany();
    await prisma.systemSettings.deleteMany();
    
    console.log('✓ Database cleared.');
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }

  // 2. Passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. System Settings
  console.log('Step 2: Seeding system settings...');
  await prisma.systemSettings.create({
    data: { extraBaggagePrice: 2500 }
  });

  // 4. Bus Models
  console.log('Step 3: Seeding bus models...');
  const luxuryModel = await prisma.busModel.create({
    data: {
      name: 'Luxury Coach',
      basePrice: 15000,
      seatMatrix: { rows: 10, cols: 5, total: 50 }
    }
  });

  const sprinterModel = await prisma.busModel.create({
    data: {
      name: 'Mercedes Sprinter',
      basePrice: 8500,
      seatMatrix: { rows: 5, cols: 3, total: 15 }
    }
  });

  // 5. Users (Admin & Ticketers)
  console.log('Step 4: Seeding users...');
  const admin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@tarix.com',
      password: hashedPassword,
      role: 'Admin',
      phone: '+2348011223344'
    }
  });

  const ticketer1 = await prisma.user.create({
    data: {
      name: 'Babatunde Olawale',
      email: 'baba@tarix.com',
      password: hashedPassword,
      role: 'Ticketer',
      phone: '+2348022334455',
      ticketer: {
        create: {
          idNumber: 'TIC-001',
          phone: '+2348022334455',
          homeAddress: '12 Lekki Phase 1, Lagos',
          station: 'Lagos Terminal',
          workShift: 'Morning',
          monthlySalary: 85000,
          walletBalance: 150000
        }
      }
    },
    include: { ticketer: true }
  });

  const ticketer2 = await prisma.user.create({
    data: {
      name: 'Nneka Eze',
      email: 'nneka@tarix.com',
      password: hashedPassword,
      role: 'Ticketer',
      phone: '+2348033445566',
      ticketer: {
        create: {
          idNumber: 'TIC-002',
          phone: '+2348033445566',
          homeAddress: '45 Garki Area, Abuja',
          station: 'Abuja Station',
          workShift: 'Evening',
          monthlySalary: 85000,
          walletBalance: 200000
        }
      }
    },
    include: { ticketer: true }
  });

  // 6. Fleet (Buses)
  console.log('Step 5: Seeding fleet...');
  const bus1 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-001',
      nickname: 'Swift Eagle',
      chassisNumber: 'CH-882193',
      engineNumber: 'EN-00122',
      ownerName: 'Tarix HQ',
      ownerPhone: '+2348011111111',
      manufacturer: 'Volvo',
      model: '9700 Luxury',
      year: 2023,
      color: 'Emerald Green',
      fuelType: 'Diesel',
      totalCapacity: 50,
      availableSeats: 50,
      maintenanceStatus: 'Excellent',
      status: 'Assigned',
      transmissionType: 'Automatic',
      amenities: ['WiFi', 'Air Conditioning', 'Charging Ports', 'Entertainment System'],
      busModelId: luxuryModel.id,
      busPhotosUrls: ['https://res.cloudinary.com/demo/image/upload/v1/bus1.jpg']
    }
  });

  const bus2 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-002',
      nickname: 'Desert Fox',
      chassisNumber: 'CH-993210',
      engineNumber: 'EN-00331',
      ownerName: 'Tarix HQ',
      ownerPhone: '+2348011111111',
      manufacturer: 'Mercedes',
      model: 'Sprinter 516 CDI',
      year: 2024,
      color: 'Arctic White',
      fuelType: 'Diesel',
      totalCapacity: 15,
      availableSeats: 15,
      maintenanceStatus: 'Excellent',
      status: 'Assigned',
      transmissionType: 'Automatic',
      amenities: ['Air Conditioning', 'Charging Ports'],
      busModelId: sprinterModel.id,
      busPhotosUrls: ['https://res.cloudinary.com/demo/image/upload/v1/bus2.jpg']
    }
  });

  const bus3 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-003',
      nickname: 'Mountain Goat',
      chassisNumber: 'CH-772155',
      engineNumber: 'EN-00224',
      ownerName: 'Lagos Branch',
      ownerPhone: '+2348022222222',
      manufacturer: 'Toyota',
      model: 'Coaster',
      year: 2021,
      color: 'Navy Blue',
      fuelType: 'Diesel',
      totalCapacity: 30,
      availableSeats: 0, // Mocking "On Trip" availability
      maintenanceStatus: 'Good',
      status: 'Available',
      transmissionType: 'Manual',
      amenities: ['Air Conditioning'],
      busPhotosUrls: ['https://res.cloudinary.com/demo/image/upload/v1/bus3.jpg']
    }
  });

  const bus4 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-004',
      nickname: 'City Cruiser',
      chassisNumber: 'CH-661022',
      engineNumber: 'EN-00991',
      ownerName: 'Abuja Branch',
      ownerPhone: '+2348033333333',
      manufacturer: 'Higer',
      model: 'A30',
      year: 2019,
      color: 'Sunset Orange',
      fuelType: 'Petrol',
      totalCapacity: 50,
      availableSeats: 50,
      maintenanceStatus: 'Poor', // Mocking "Maintenance" status
      status: 'Maintenance',
      transmissionType: 'Automatic',
      amenities: ['WiFi', 'Air Conditioning'],
      busPhotosUrls: ['https://res.cloudinary.com/demo/image/upload/v1/bus4.jpg']
    }
  });

  // 7. Team (Drivers)
  console.log('Step 6: Seeding drivers...');
  const driver1 = await prisma.driver.create({
    data: {
      driverId: 'DRV-001',
      fullName: 'Sani Mohammed',
      email: 'sani@tarix.com',
      phone: '+2348044556677',
      homeAddress: 'Block 4, Sabo, Kaduna',
      licenseNumber: 'LAG-993-DRV',
      yearsOfExperience: 12,
      licenseIssueDate: new Date('2020-01-01'),
      licenseExpiryDate: new Date('2027-01-01'),
      employmentDate: new Date('2022-06-01'),
      monthlySalary: 120000,
      emergencyContactName: 'Amina Mohammed',
      emergencyContactPhone: '+2348055667788',
      assignedBusId: bus1.id,
      status: 'Active',
      profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/driver1.jpg'
    }
  });

  const driver2 = await prisma.driver.create({
    data: {
      driverId: 'DRV-002',
      fullName: 'Chidi Okoro',
      email: 'chidi@tarix.com',
      phone: '+2348055667788',
      homeAddress: '15 Ogui Road, Enugu',
      licenseNumber: 'EN-112-DRV',
      yearsOfExperience: 8,
      licenseIssueDate: new Date('2021-05-15'),
      licenseExpiryDate: new Date('2026-05-15'),
      employmentDate: new Date('2023-01-10'),
      monthlySalary: 95000,
      emergencyContactName: 'Ifeoma Okoro',
      emergencyContactPhone: '+2348066778899',
      assignedBusId: bus2.id,
      status: 'Active',
      profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/driver2.jpg'
    }
  });

  const driver3 = await prisma.driver.create({
    data: {
      driverId: 'DRV-003',
      fullName: 'Femi Adebayo',
      email: 'femi@tarix.com',
      phone: '+2348066778899',
      homeAddress: '22 Ring Road, Ibadan',
      licenseNumber: 'IB-445-DRV',
      yearsOfExperience: 15,
      licenseIssueDate: new Date('2018-10-10'),
      licenseExpiryDate: new Date('2023-10-10'), // EXPIRED EDGE CASE
      employmentDate: new Date('2020-02-01'),
      monthlySalary: 110000,
      emergencyContactName: 'Yinka Adebayo',
      emergencyContactPhone: '+2348077889900',
      status: 'Inactive',
      profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/driver3.jpg'
    }
  });

  const driver4 = await prisma.driver.create({
    data: {
      driverId: 'DRV-004',
      fullName: 'Umaru Danladi',
      email: 'umaru@tarix.com',
      phone: '+2348077889900',
      homeAddress: 'Shop 2, Central Market, Abuja',
      licenseNumber: 'ABJ-771-DRV',
      yearsOfExperience: 5,
      licenseIssueDate: new Date('2022-11-20'),
      licenseExpiryDate: new Date('2025-11-20'),
      employmentDate: new Date('2024-03-01'),
      monthlySalary: 75000,
      emergencyContactName: 'Fatima Danladi',
      emergencyContactPhone: '+2348088990011',
      status: 'Active',
      profilePhotoUrl: 'https://res.cloudinary.com/demo/image/upload/v1/driver4.jpg'
    }
  });

  // 8. Operations (Trips)
  console.log('Step 7: Seeding operations (Trips)...');
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  // 3 Completed Trips
  await prisma.trip.createMany({
    data: [
      {
        departureTerminal: 'Lagos Terminal',
        arrivalTerminal: 'Abuja Station',
        departureDate: yesterday,
        departureTime: '06:00 AM',
        price: 15000,
        availableSeats: 0,
        busId: bus1.id,
        driverId: driver1.id,
        status: 'Completed'
      },
      {
        departureTerminal: 'Port Harcourt',
        arrivalTerminal: 'Lagos Terminal',
        departureDate: yesterday,
        departureTime: '08:30 AM',
        price: 12000,
        availableSeats: 2,
        busId: bus3.id,
        driverId: driver2.id,
        status: 'Completed'
      },
      {
        departureTerminal: 'Kano',
        arrivalTerminal: 'Kaduna',
        departureDate: yesterday,
        departureTime: '10:00 AM',
        price: 4500,
        availableSeats: 5,
        busId: bus2.id,
        driverId: driver4.id,
        status: 'Completed'
      }
    ]
  });

  // 2 Active Trips (Today)
  await prisma.trip.createMany({
    data: [
      {
        departureTerminal: 'Lagos Terminal',
        arrivalTerminal: 'Ibadan',
        departureDate: today,
        departureTime: '09:00 AM',
        price: 3500,
        availableSeats: 4,
        busId: bus2.id,
        driverId: driver2.id,
        status: 'Active'
      },
      {
        departureTerminal: 'Abuja Station',
        arrivalTerminal: 'Lagos Terminal',
        departureDate: today,
        departureTime: '07:30 AM',
        price: 15000,
        availableSeats: 12,
        busId: bus4.id,
        driverId: driver1.id,
        status: 'Active'
      }
    ]
  });

  // 3 Scheduled Trips (Future)
  await prisma.trip.createMany({
    data: [
      {
        departureTerminal: 'Lagos Terminal',
        arrivalTerminal: 'Owerri',
        departureDate: tomorrow,
        departureTime: '06:00 AM',
        price: 18000,
        availableSeats: 50,
        busId: bus1.id,
        driverId: driver1.id,
        status: 'Scheduled'
      },
      {
        departureTerminal: 'Abuja Station',
        arrivalTerminal: 'Jos',
        departureDate: tomorrow,
        departureTime: '08:00 AM',
        price: 7000,
        availableSeats: 15,
        busId: bus2.id,
        driverId: driver4.id,
        status: 'Scheduled'
      },
      {
        departureTerminal: 'Ibadan',
        arrivalTerminal: 'Lagos Terminal',
        departureDate: tomorrow,
        departureTime: '11:00 AM',
        price: 3500,
        availableSeats: 30,
        busId: bus3.id,
        driverId: driver2.id,
        status: 'Scheduled'
      }
    ]
  });

  console.log('--- Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
