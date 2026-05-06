const prisma = require('../src/config/db');

async function main() {
  const standardMatrix = [
    ["1A", "1B", null, "1C", "1D"],
    ["2A", "2B", null, "2C", "2D"],
    ["3A", "3B", null, "3C", "3D"],
    ["4A", "4B", null, "4C", "4D"],
    ["5A", "5B", null, "5C", "5D"]
  ];

  const vipMatrix = [
    ["1A", null, "1B", "1C"],
    ["2A", null, "2B", "2C"],
    ["3A", null, "3B", "3C"]
  ];

  const standard = await prisma.busModel.upsert({
    where: { name: "Standard 50-Seater" },
    update: {},
    create: {
      name: "Standard 50-Seater",
      basePrice: 15000,
      seatMatrix: standardMatrix
    }
  });

  const vip = await prisma.busModel.upsert({
    where: { name: "VIP 15-Seater" },
    update: {},
    create: {
      name: "VIP 15-Seater",
      basePrice: 25000,
      seatMatrix: vipMatrix
    }
  });

  console.log("Seeded successfully", { standard, vip });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
