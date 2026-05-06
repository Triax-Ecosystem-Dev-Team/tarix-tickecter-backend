const prisma = require('../src/config/db');

// Sprinter Van layout: 5 rows.
// Each row: ["XA", null, "XB", "XC"]
// Left side  = single seat (A)
// null       = centre aisle
// Right side = double seat (B, C)
const sprinterMatrix = [
  ['1A', null, '1B', '1C'],
  ['2A', null, '2B', '2C'],
  ['3A', null, '3B', '3C'],
  ['4A', null, '4B', '4C'],
  ['5A', null, '5B', '5C'],
];

async function main() {
  const sprinter = await prisma.busModel.upsert({
    where: { name: 'Sprinter Van' },
    update: {
      basePrice: 25000,
      seatMatrix: sprinterMatrix,
    },
    create: {
      name: 'Sprinter Van',
      basePrice: 25000,
      seatMatrix: sprinterMatrix,
    },
  });

  console.log('✅ Sprinter Van seeded successfully:');
  console.log(`   ID        : ${sprinter.id}`);
  console.log(`   Name      : ${sprinter.name}`);
  console.log(`   Base Price: ₦${sprinter.basePrice.toLocaleString()}`);
  console.log(`   Matrix    : ${sprinter.seatMatrix.length} rows`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
