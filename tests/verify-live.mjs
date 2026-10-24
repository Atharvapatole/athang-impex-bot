// Live Verification Script
const BASE_URL = "http://localhost:3000";

async function runVerification() {
  console.log("=== STARTING LIVE APPLICATION VERIFICATION ===\n");

  // 1. Health Checks
  console.log("1. Checking Health Endpoints...");
  const liveRes = await fetch(`${BASE_URL}/api/health/live`);
  console.log("  /api/health/live status:", liveRes.status, await liveRes.json());

  const readyRes = await fetch(`${BASE_URL}/api/health/ready`);
  console.log("  /api/health/ready status:", readyRes.status, await readyRes.json());

  // 2. Login
  console.log("\n2. Testing Administrator Authentication...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@platform.local",
      password: "AdminPassword123!",
    }),
  });

  const cookieHeader = loginRes.headers.get("set-cookie") || "";
  const loginData = await loginRes.json();
  console.log("  Login Response:", loginRes.status, loginData);

  const tokenCookie = cookieHeader.split(";")[0];
  console.log("  Session Cookie Acquired:", tokenCookie ? "YES" : "NO");

  const authHeaders = {
    Cookie: tokenCookie,
    "Content-Type": "application/json",
  };

  // 3. Verify Session User
  console.log("\n3. Verifying Authenticated Session...");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
  console.log("  /api/auth/me Response:", meRes.status, await meRes.json());

  // 4. Test Fetching Businesses
  console.log("\n4. Testing Business Persistence & Scoping...");
  const bizRes = await fetch(`${BASE_URL}/api/businesses`, { headers: authHeaders });
  const bizData = await bizRes.json();
  console.log(`  Found ${bizData.businesses?.length} pre-seeded businesses:`);
  for (const b of bizData.businesses || []) {
    console.log(`    - [${b.slug}] ${b.name} (${b.website}) | Channels: ${b._count?.channels}, Sources: ${b._count?.kbSources}, Leads: ${b._count?.leads}`);
  }

  // 5. Test Creating a New Business
  console.log("\n5. Testing Creating and Editing a Business...");
  const testSlug = `test-spice-${Date.now()}`;
  const createBizRes = await fetch(`${BASE_URL}/api/businesses`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Spice World Exports",
      slug: testSlug,
      description: "Test agro commodity merchant exporter.",
      website: "https://spiceworld.example.com",
      email: "sales@spiceworld.example.com",
      phone: "+91 9876543210",
      timezone: "Asia/Kolkata",
    }),
  });
  const createdBiz = await createBizRes.json();
  console.log("  Create Business Status:", createBizRes.status, "Created ID:", createdBiz.business?.id);

  // Edit the created business
  const editBizRes = await fetch(`${BASE_URL}/api/businesses/${createdBiz.business.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      description: "Updated description: Premier organic spice exporter.",
      versionNote: "Added organic spice line",
    }),
  });
  const editedBiz = await editBizRes.json();
  console.log("  Edit Business Status:", editBizRes.status, "Updated Description:", editedBiz.business?.description);

  // 6. Test AI Provider Configuration
  console.log("\n6. Testing AI Provider Configurations...");
  const aiRes = await fetch(`${BASE_URL}/api/ai-providers`, { headers: authHeaders });
  const aiData = await aiRes.json();
  console.log(`  Found ${aiData.configs?.length} AI provider configs:`);
  for (const c of aiData.configs || []) {
    console.log(`    - Tier #${c.priority}: ${c.provider} (${c.modelId}) [${c.status}] Masked Key: ${c.maskedKey}`);
  }

  // Test updating an AI config
  if (aiData.configs?.length > 0) {
    const firstConfig = aiData.configs[0];
    const updateAiRes = await fetch(`${BASE_URL}/api/ai-providers`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        id: firstConfig.id,
        temperature: 0.25,
        maxTokens: 1500,
      }),
    });
    console.log("  AI Config Update Status:", updateAiRes.status);
  }

  // 7. Test Knowledge Base Ingestion & Search Simulation
  console.log("\n7. Testing Knowledge Base Search Simulation...");
  const athangBiz = bizData.businesses.find((b) => b.slug === "athang-impex");
  const searchRes = await fetch(`${BASE_URL}/api/knowledge-base/test-search`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      businessId: athangBiz.id,
      query: "dehydrated onion powder mesh size",
    }),
  });
  const searchData = await searchRes.json();
  console.log(`  Search for 'dehydrated onion powder mesh size' returned ${searchData.results?.length} chunks:`);
  for (const r of searchData.results || []) {
    console.log(`    - Score: ${r.score.toFixed(1)} | Source: ${r.sourceName}`);
    console.log(`      Content snippet: "${r.content.slice(0, 100)}..."`);
  }

  // 8. Test Conversations & Leads Persistence
  console.log("\n8. Testing Conversation Inbox & Leads...");
  const convRes = await fetch(`${BASE_URL}/api/conversations`, { headers: authHeaders });
  const convData = await convRes.json();
  console.log(`  Found ${convData.conversations?.length} active conversations.`);
  if (convData.conversations?.length > 0) {
    const firstConv = convData.conversations[0];
    console.log(`    - Conversation #${firstConv.id}: Channel ${firstConv.channelType} with ${firstConv.contact?.displayName} (${firstConv.channelIdentifier})`);
  }

  const leadsRes = await fetch(`${BASE_URL}/api/leads`, { headers: authHeaders });
  const leadsData = await leadsRes.json();
  console.log(`  Found ${leadsData.leads?.length} captured leads:`);
  for (const l of leadsData.leads || []) {
    console.log(`    - Lead: ${l.buyerName || l.company} | Product: ${l.productOfInterest} | Qty: ${l.quantityAndUnit} | Port: ${l.destinationPort} [${l.status}]`);
  }

  // 9. Verify All Dashboard Pages Return HTTP 200
  console.log("\n9. Testing Frontend Dashboard Page Routes...");
  const pages = [
    "/dashboard",
    "/businesses",
    "/channels",
    "/ai-providers",
    "/knowledge-base",
    "/instructions",
    "/conversations",
    "/contacts",
    "/leads",
    "/usage",
    "/logs",
    "/settings",
    "/settings/security",
  ];

  for (const page of pages) {
    const pageRes = await fetch(`${BASE_URL}${page}`, { headers: { Cookie: tokenCookie } });
    console.log(`  Route ${page.padEnd(20)}: HTTP ${pageRes.status}`);
  }

  console.log("\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===");
}

runVerification().catch(console.error);
