const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node scripts/seed-profiles.js <userId>");
  process.exit(1);
}

const profiles = [
  {
    name: "Mobile App Developer",
    title: "Android / React Native Developer",
    summary:
      "B.Tech CSE student building production-ready Android and cross-platform apps with real-world impact.",
    contactEmail: "anikeshuzumaki@gmail.com",
    contactPhone: "+91-8744-003-734",
    location: "Dwarka, New Delhi",
    portfolioUrl: "https://anikeshiro.vercel.app",
    githubUrl: "https://github.com/uzumaki-ak",
    linkedinUrl: "https://www.linkedin.com/in/anikesh-kumar-1b87b42a5",
    skills: [
      "Kotlin",
      "JavaScript",
      "TypeScript",
      "React Native",
      "Flutter",
      "Android SDK",
      "Firebase",
      "Supabase",
      "PostgreSQL",
      "MongoDB",
      "Prisma",
      "Git",
    ],
    projects: [
      {
        name: "MeetPing",
        impact:
          "Android app with offline speech recognition, summarization, and action-item tracking.",
      },
      {
        name: "NotifIQ",
        impact:
          "Smart notification manager with ML-based prioritization, MVVM, Room DB, and Hilt.",
      },
      {
        name: "Rakshak",
        impact:
          "Medicine management app with OCR scanning, reminders, and an AI health assistant.",
      },
    ],
    experience: [
      {
        role: "Android Developer (React Native & Kotlin)",
        company: "Throttle Infotech",
        dates: "Aug 2025 - Sep 2025",
        highlights:
          "Built attendance tracking system and automated payment reminder emails.",
      },
    ],
    education: [
      {
        degree: "B.Tech Computer Science and Engineering",
        school: "Maharshi Dayanand University",
        dates: "2023 - 2027",
        details: "New Delhi, India",
      },
    ],
    certifications: [],
    achievements: [
      "2nd Place — NSUT Delhi Hackathon 2025 (Team Astra X)",
      "Mentor — NexHack 2025 at Geeta University",
    ],
    experienceLevel: "JUNIOR",
    preferredRoles: ["Android Developer", "React Native Developer", "Mobile App Developer"],
    tonePreference: "confident",
    isDefault: false,
  },
  {
    name: "Web / Full-Stack Developer",
    title: "Full Stack Web Developer",
    summary:
      "B.Tech CSE student with hands-on experience shipping full-stack web apps and dashboards.",
    contactEmail: "anikeshuzumaki@gmail.com",
    contactPhone: "+91-8744-003-734",
    location: "Dwarka, New Delhi",
    portfolioUrl: "https://anikeshiro.vercel.app",
    githubUrl: "https://github.com/uzumaki-ak",
    linkedinUrl: "https://www.linkedin.com/in/anikesh-kumar-1b87b42a5",
    skills: [
      "TypeScript",
      "JavaScript",
      "Next.js",
      "React",
      "Node.js",
      "Express",
      "PostgreSQL",
      "Prisma",
      "Supabase",
      "Firebase",
      "MongoDB",
      "TanStack Query",
      "ShadCN",
      "Tailwind CSS",
      "Git",
    ],
    projects: [
      {
        name: "AI Assist",
        impact:
          "Cross-platform AI agent platform with authentication, real-time chat, and history management.",
      },
      {
        name: "Full-Stack Admin Dashboard",
        impact:
          "Built auth, user profiles, and an analytics dashboard for a production web app.",
      },
      {
        name: "Smart Campus (Hackathon)",
        impact:
          "Smart campus solution with AI canteen management, digital lost & found, and scholarship finder.",
      },
    ],
    experience: [
      {
        role: "Full Stack Developer (Contract)",
        company: "CodeWithDhruv",
        dates: "Sep 2025 - Oct 2025",
        highlights:
          "Built auth, user profiles, and analytics dashboards with Next.js and Supabase.",
      },
    ],
    education: [
      {
        degree: "B.Tech Computer Science and Engineering",
        school: "Maharshi Dayanand University",
        dates: "2023 - 2027",
        details: "New Delhi, India",
      },
    ],
    certifications: [],
    achievements: [
      "15+ hackathons with consistent Top 5/Top 10 placements",
    ],
    experienceLevel: "JUNIOR",
    preferredRoles: ["Full Stack Developer", "Frontend Developer", "Backend Developer", "Web Developer"],
    tonePreference: "confident",
    isDefault: true,
  },
];

async function upsertByName(profile) {
  const existing = await prisma.profile.findFirst({
    where: { userId, name: profile.name },
  });

  if (profile.isDefault) {
    await prisma.profile.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  if (existing) {
    return prisma.profile.update({
      where: { id: existing.id },
      data: {
        ...profile,
      },
    });
  }

  return prisma.profile.create({
    data: {
      userId,
      ...profile,
    },
  });
}

async function main() {
  for (const profile of profiles) {
    await upsertByName(profile);
  }
  console.log("Seeded profiles for user:", userId);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
