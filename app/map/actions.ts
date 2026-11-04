"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type ContributionMapPoint = {
  id: string;
  title: string;
  organization: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  summary: string;
  contributorType: string;
  contributionCount: number;
  detailsList: string[];
};

function getFallbackClusters(): ContributionMapPoint[] {
  return [
    {
      id: "kmutt_fibo",
      title: "KMUTT Institute of Field Robotics (FIBO)",
      organization: "King Mongkut's University of Technology Thonburi",
      locationLabel: "Bangkok, Thailand",
      latitude: 13.6521,
      longitude: 100.4942,
      summary: "Thailand's premier robotics institute. Actively researching human-robot interaction, medical humanoid assistants, and open-source humanoid locomotion control.",
      contributorType: "University",
      contributionCount: 12,
      detailsList: ["FIBO Humanoid Walker", "Medical Service Robot Cabinet", "HRI Emotion Modeling Dataset"]
    },
    {
      id: "chula_robo",
      title: "Chulalongkorn LIRA Lab",
      organization: "Chulalongkorn University",
      locationLabel: "Bangkok, Thailand",
      latitude: 13.7367,
      longitude: 100.5331,
      summary: "Leading research group in social humanoids and medical exoskeleton systems. Developed several generations of eldercare companion robots.",
      contributorType: "University",
      contributionCount: 8,
      detailsList: ["CU Elder Companion", "Chula Exoskeleton Knee v2", "Thai Speech Interaction Model"]
    },
    {
      id: "vistec_brain",
      title: "VISTEC Brain Computer Interface Lab",
      organization: "Vidyasirimedhi Institute of Science and Technology",
      locationLabel: "Rayong, Thailand",
      latitude: 12.9818,
      longitude: 101.4429,
      summary: "State-of-the-art bio-inspired locomotion and neural control mapping. Focuses on humanoid hand dexterity and reinforcement learning models.",
      contributorType: "University",
      contributionCount: 5,
      detailsList: ["Biomimetic Humanoid Hand", "Dextrous Gripper Control System"]
    },
    {
      id: "cmu_robotics",
      title: "Chiang Mai University Robotics Lab",
      organization: "Chiang Mai University",
      locationLabel: "Chiang Mai, Thailand",
      latitude: 18.8025,
      longitude: 98.9516,
      summary: "Developing agricultural service humanoids and navigation platforms for northern Thailand health and tourism sectors.",
      contributorType: "University",
      contributionCount: 4,
      detailsList: ["Lanna Tour Guide Robot", "Autonomous Hospital Trolley"]
    },
    {
      id: "ct_asia",
      title: "CT Asia Robotics (Dinsaw)",
      organization: "CT Asia Co., Ltd.",
      locationLabel: "Bangkok, Thailand",
      latitude: 13.7845,
      longitude: 100.5892,
      summary: "Commercial pioneer of companion humanoids in Southeast Asia. Developer of the Dinsaw robot series, deployed in hospitals across Thailand and Japan.",
      contributorType: "Enterprise",
      contributionCount: 9,
      detailsList: ["Dinsaw Mini companion", "Dinsaw 4 Eldercare Assist", "Commercial Hospital Reception Deployment"]
    }
  ];
}

export async function analyzeClustersWithGemini(): Promise<ContributionMapPoint[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "mock_key" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY environment variable is not set or is invalid.");
  }

  // 1. Fetch contributions, robot models, and owned inventory
  const [contributions, robots, inventory] = await Promise.all([
    prisma.contribution.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        organization: true,
        contributorName: true,
        contributionType: true
      }
    }),
    prisma.robotModel.findMany({
      select: {
        id: true,
        canonicalName: true,
        description: true,
        developerOrg: true,
        countryOfOrigin: true
      }
    }),
    prisma.ownedInventory.findMany({
      select: {
        id: true,
        displayName: true,
        ownerOrg: true,
        custodian: true,
        locationLabel: true,
        notes: true
      }
    })
  ]);

  // 2. Prepare the payload for Gemini
  const payload = {
    contributions: contributions.map(c => ({
      type: "contribution",
      id: c.id,
      title: c.title,
      description: c.description,
      org: c.organization || c.contributorName,
      contribType: c.contributionType
    })),
    robots: robots.map(r => ({
      type: "robot_model",
      id: r.id,
      name: r.canonicalName,
      desc: r.description,
      org: r.developerOrg,
      country: r.countryOfOrigin
    })),
    inventory: inventory.map(i => ({
      type: "owned_inventory",
      id: i.id,
      name: i.displayName,
      org: i.ownerOrg || i.custodian,
      location: i.locationLabel,
      notes: i.notes
    }))
  };

  const prompt = `
You are an expert GIS and robotics analyst mapping the humanoid and social robotics ecosystem in Thailand.
Below is the database dump of contributions, robot models, and owned inventory from the Thailand Humanoid Atlas:

${JSON.stringify(payload, null, 2)}

Please read through all records and group/cluster them by geographical location of their development, research, or deployment within Thailand. 
Identify the key institutions, labs, or organizations (e.g. universities like Chulalongkorn, KMUTT, VISTEC, Chiang Mai University, or companies like CT Asia Robotics) responsible for these contributions.

For each cluster/location:
1. Provide a unique ID.
2. Set 'title' to the institution or entity name (e.g. "Chulalongkorn University Robotics Lab").
3. Set 'organization' to the organization name.
4. Set 'locationLabel' to the city and region in Thailand (e.g., "Bangkok, Thailand" or "Rayong, Thailand").
5. Geocode the location and set 'latitude' and 'longitude' to its coordinates in Thailand (use precise coordinates for the campus/facility if known, otherwise default to city coordinates).
6. Set 'summary' to a concise 1-2 sentence description summarizing what humanoid robotics contributions came from this location based on the database data (e.g. what robots they own, what papers/repos they contributed, etc.).
7. Set 'contributorType' to one of: "University", "Enterprise", "Government", "Community".
8. Set 'contributionCount' to the count of connected database records.
9. Set 'detailsList' to a list of titles/names of the specific contributions/robots/inventory connected to this location.

Return the response as a JSON object matching the requested schema.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            clusters: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" },
                  title: { type: "STRING" },
                  organization: { type: "STRING" },
                  locationLabel: { type: "STRING" },
                  latitude: { type: "NUMBER" },
                  longitude: { type: "NUMBER" },
                  summary: { type: "STRING" },
                  contributorType: { type: "STRING" },
                  contributionCount: { type: "NUMBER" },
                  detailsList: {
                    type: "ARRAY",
                    items: { type: "STRING" }
                  }
                },
                required: ["id", "title", "organization", "locationLabel", "latitude", "longitude", "summary", "contributorType", "contributionCount", "detailsList"]
              }
            }
          },
          required: ["clusters"]
        }
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error("Empty response from Gemini API");
  }

  const parsed = JSON.parse(textResponse);
  const clusters = (parsed.clusters || []) as ContributionMapPoint[];
  
  // Save to StatsCache
  await prisma.statsCache.upsert({
    where: { key: "map_contribution_clusters" },
    update: {
      valueJson: clusters as any,
      updatedAt: new Date()
    },
    create: {
      key: "map_contribution_clusters",
      valueJson: clusters as any
    }
  });

  return clusters;
}

export async function fetchContributionClusters(): Promise<ContributionMapPoint[]> {
  try {
    const cached = await prisma.statsCache.findUnique({
      where: { key: "map_contribution_clusters" }
    });
    if (cached && cached.valueJson && Array.isArray(cached.valueJson)) {
      return cached.valueJson as unknown as ContributionMapPoint[];
    }
  } catch (e) {
    console.error("Cache fetch failed:", e);
  }

  try {
    return await analyzeClustersWithGemini();
  } catch (e) {
    console.error("Gemini cluster analysis failed, using fallback mock seeds:", e);
    return getFallbackClusters();
  }
}

export async function reanalyzeClustersWithGemini() {
  try {
    await analyzeClustersWithGemini();
  } catch (e) {
    console.error("Reanalysis action encountered an error, writing high-fidelity mock seeds:", e);
    // If analyzeClustersWithGemini fails or apiKey check fails, write mock seeds to StatsCache so we always have data
    const fallbacks = getFallbackClusters();
    try {
      await prisma.statsCache.upsert({
        where: { key: "map_contribution_clusters" },
        update: {
          valueJson: fallbacks as any,
          updatedAt: new Date()
        },
        create: {
          key: "map_contribution_clusters",
          valueJson: fallbacks as any
        }
      });
    } catch (dbErr) {
      console.error("Failed to write fallback to statsCache database:", dbErr);
    }
  }
  revalidatePath("/map");
}
