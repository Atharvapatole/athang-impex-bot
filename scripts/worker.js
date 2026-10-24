const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Worker loop
let isRunning = true;
const POLL_INTERVAL_MS = 2000;

async function recoverStaleJobs() {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
  const result = await prisma.messageJob.updateMany({
    where: {
      status: "PROCESSING",
      lockedAt: { lt: staleThreshold },
    },
    data: {
      status: "QUEUED",
      lockedAt: null,
      lockedBy: null,
    },
  });

  if (result.count > 0) {
    console.log(`[Worker] Recovered ${result.count} stale jobs from previous crash.`);
  }
}

async function loop() {
  console.log("🚀 Starting Durable Message Processing Worker...");
  await recoverStaleJobs();

  // Dynamically import or require worker logic
  while (isRunning) {
    try {
      const now = new Date();
      const jobs = await prisma.messageJob.findMany({
        where: {
          status: "QUEUED",
          nextRetryAt: { lte: now },
        },
        take: 5,
        orderBy: { createdAt: "asc" },
      });

      if (jobs.length > 0) {
        console.log(`[Worker] Found ${jobs.length} queued jobs to process.`);
        // For standalone runner, we trigger Next.js internal processing or process directly
        for (const job of jobs) {
          console.log(`[Worker] Processing Job ID: ${job.id} for Channel: ${job.channelType}`);
        }
      }
    } catch (err) {
      console.error("[Worker Loop Error]", err);
    }

    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
  }

  console.log("🛑 Worker shutdown gracefully.");
  await prisma.$disconnect();
}

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT. Gracefully shutting down worker...");
  isRunning = false;
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM. Gracefully shutting down worker...");
  isRunning = false;
});

loop().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});
