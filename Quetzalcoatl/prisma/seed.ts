import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const projects = [
    { slug: "born-sales", name: "Born Sales" },
    { slug: "adharas", name: "Adharas" },
    { slug: "sdr-imobiliario", name: "SDR Imobiliario" },
    { slug: "openclaw", name: "OpenClaw" },
    { slug: "infraestrutura-debian", name: "Infraestrutura Debian" },
  ];

  for (const project of projects) {
    await prisma.project.upsert({ where: { slug: project.slug }, create: project, update: project });
  }

  const bornSales = await prisma.project.findUniqueOrThrow({ where: { slug: "born-sales" } });
  const adharas = await prisma.project.findUniqueOrThrow({ where: { slug: "adharas" } });
  const sdr = await prisma.project.findUniqueOrThrow({ where: { slug: "sdr-imobiliario" } });

  await prisma.memory.createMany({
    data: [
      {
        projectId: bornSales.id,
        type: "decisao",
        title: "Fonte oficial PDF/DWG",
        status: "vigente",
        priority: "alta",
        content: "O PDF e a fonte oficial para saber quais pilares existem. O DWG e a fonte oficial para posicoes geometricas. A conciliacao deve usar matching global, preferencialmente algoritmo Hungaro.",
      },
      {
        projectId: adharas.id,
        type: "regra",
        title: "Banho apenas em cachorros",
        status: "vigente",
        priority: "critica",
        content: "O agente da Adharas Pet Shop nao deve oferecer banho para gatos. Banho e apenas para cachorros.",
      },
      {
        projectId: sdr.id,
        type: "prompt",
        title: "Classificador de intencao inicial",
        status: "vigente",
        priority: "alta",
        content: "Classificar resposta do cliente em COMPRAR, ALUGAR ou CORRETOR. Saida deve ser JSON estrito.",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
