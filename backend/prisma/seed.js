const prisma = require('../src/config/db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Seeding data...');

  // 1. Clear existing relevant data if needed or just insert new ones (safest to just insert if they don't exist, but for simplicity we can just create)
  // Let's create unique identifiers or just create new records

  // Buses
  const bus1 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-001',
      manufacturer: 'Mercedes',
      model: 'Sprinter Van',
      totalCapacity: 15,
      availableSeats: 15,
      maintenanceStatus: 'Good',
      chassisNumber: 'CHAS-001' + Date.now(),
      engineNumber: 'ENG-001' + Date.now(),
      ownerName: 'Tarix HQ',
      ownerPhone: '08000000000',
      year: 2022,
      color: 'White',
      fuelType: 'Diesel',
      transmissionType: 'Automatic'
    }
  });

  const bus2 = await prisma.bus.create({
    data: {
      registrationNumber: 'BUS-002',
      manufacturer: 'Toyota',
      model: 'Luxury Coach',
      totalCapacity: 50,
      availableSeats: 50,
      maintenanceStatus: 'Good',
      chassisNumber: 'CHAS-002' + Date.now(),
      engineNumber: 'ENG-002' + Date.now(),
      ownerName: 'Tarix HQ',
      ownerPhone: '08000000000',
      year: 2023,
      color: 'Blue',
      fuelType: 'Diesel',
      transmissionType: 'Manual'
    }
  });

  // Drivers
  const driver1 = await prisma.driver.create({
    data: {
      fullName: 'Ahmed Hassan',
      email: 'ahmed' + Date.now() + '@tarix.com',
      phone: '08012345671',
      homeAddress: '123 Driver Lane',
      emergencyContactName: 'Fatima Hassan',
      emergencyContactPhone: '08011111111',
      licenseNumber: 'LIC-AHM-' + Date.now(),
      yearsOfExperience: 5,
      licenseIssueDate: new Date('2020-01-01'),
      licenseExpiryDate: new Date('2025-01-01'),
      employmentDate: new Date('2021-01-01'),
      monthlySalary: 150000,
    }
  });

  const driver2 = await prisma.driver.create({
    data: {
      fullName: 'Chioma Okafor',
      email: 'chioma' + Date.now() + '@tarix.com',
      phone: '08012345672',
      homeAddress: '456 Driver Ave',
      emergencyContactName: 'Emeka Okafor',
      emergencyContactPhone: '08022222222',
      licenseNumber: 'LIC-CHI-' + Date.now(),
      yearsOfExperience: 8,
      licenseIssueDate: new Date('2018-01-01'),
      licenseExpiryDate: new Date('2026-01-01'),
      employmentDate: new Date('2019-01-01'),
      monthlySalary: 180000,
    }
  });

  // Trips
  // 1. Active trip (Lagos to Enugu) with 5 bookings
  const activeTrip = await prisma.trip.create({
    data: {
      departureTerminal: 'Lagos HQ',
      arrivalTerminal: 'Enugu',
      departureDate: new Date(),
      departureTime: '10:00 AM',
      availableSeats: 15,
      price: 8500,
      busId: bus1.id,
      driverId: driver1.id,
      status: 'Active'
    }
  });

  // 2. Completed trip (Lagos to Abuja) from two days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const completedTrip = await prisma.trip.create({
    data: {
      departureTerminal: 'Lagos HQ',
      arrivalTerminal: 'Abuja',
      departureDate: twoDaysAgo,
      departureTime: '08:00 AM',
      availableSeats: 50,
      price: 12000,
      busId: bus2.id,
      driverId: driver2.id,
      status: 'Completed'
    }
  });

  // Create Passenger to act as the passenger for bookings
  const passenger = await prisma.passenger.create({
    data: {
      loginId: 'USR-' + Date.now(),
      surname: 'Doe',
      firstname: 'John',
      dateOfBirth: new Date('1990-01-01'),
      occupation: 'Engineer',
      state: 'Lagos',
      localGovernment: 'Ikeja',
      nationality: 'Nigerian',
      address: '789 Passenger Blvd',
      phone: '09011111111',
      officePhone: '01234567',
      nextOfKinName: 'Jane Doe',
      nextOfKinPhone: '09022222222',
      nextOfKinAddress: '789 Passenger Blvd',
      nextOfKinRelationship: 'Sister'
    }
  });

  // Create 5 bookings for Active trip
  for (let i = 1; i <= 5; i++) {
    await prisma.booking.create({
      data: {
        PassengerId: passenger.id,
        tripId: activeTrip.id,
        seats: 1,
        totalPrice: 8500,
        paymentStatus: 'completed',
        bookedSeats: [`S${i}`],
        status: 'confirmed'
      }
    });
  }

  // Create 15 bookings for Completed trip to have some revenue
  for (let i = 1; i <= 15; i++) {
    await prisma.booking.create({
      data: {
        PassengerId: passenger.id,
        tripId: completedTrip.id,
        seats: 1,
        totalPrice: 12000,
        paymentStatus: 'completed',
        bookedSeats: [`S${i}`],
        status: 'confirmed',
        createdAt: twoDaysAgo
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
