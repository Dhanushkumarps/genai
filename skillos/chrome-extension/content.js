// ============================================================
// SkillOS Content Script — Free DOM-based Job Page Scraper
// ============================================================

const SKILL_KEYWORDS = [
  "Python", "JavaScript", "TypeScript", "React", "Node.js", "SQL",
  "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS", "GCP",
  "Azure", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
  "FastAPI", "Django", "REST API", "GraphQL", "Redis", "Git", "CI/CD",
  "Linux", "Agile", "Scrum", "Data Structures", "System Design", "LLM",
  "OpenAI", "LangChain", "Vector DB", "Figma", "Tailwind", "Next.js",
  "Vue", "Angular", "Spring Boot", "Java", "Go", "Rust", "C++",
  "Microservices", "Spark", "Kafka", "Airflow", "Tableau", "Power BI",
  "Excel", "R", "MATLAB", "Flutter", "React Native", "Swift", "Kotlin",
  "Selenium", "Pytest", "Jest", "Cypress", "Terraform", "Ansible",
  "Jenkins", "GitHub Actions"
];

const SITE_SELECTORS = {
  "linkedin.com": {
    desc: ".jobs-description__content",
    title: ".job-details-jobs-unified-top-card__job-title",
    company: ".job-details-jobs-unified-top-card__company-name"
  },
  "naukri.com": {
    desc: ".job-desc",
    title: ".jd-header-title",
    company: ".jd-header-comp-name"
  },
  "internshala.com": {
    desc: ".internship_details",
    title: ".profile-overview h1",
    company: ".company-name"
  },
  "unstop.com": {
    desc: ".opportunity-details",
    title: ".opportunity-title",
    company: ".company-info"
  }
};

/**
 * Matches the current hostname against known site selector keys.
 * Returns the matching key or null.
 */
function getMatchingSite() {
  const hostname = window.location.hostname;
  for (const site of Object.keys(SITE_SELECTORS)) {
    if (hostname.includes(site)) return site;
  }
  return null;
}

/**
 * Safely reads text content from a CSS selector, returns fallback if not found.
 */
function safeText(selector, fallback = "") {
  const el = document.querySelector(selector);
  return el ? el.innerText.trim() : fallback;
}

/**
 * Extracts job data from the current page using DOM selectors only.
 */
function extractJobData() {
  const site = getMatchingSite();
  const selectors = site ? SITE_SELECTORS[site] : null;

  // --- Description ---
  let descriptionText = "";
  if (selectors) {
    descriptionText = safeText(selectors.desc);
  }
  if (!descriptionText) {
    descriptionText = document.body.innerText;
  }

  // --- Skill Matching (case-insensitive) ---
  const lowerDesc = descriptionText.toLowerCase();
  const foundSkills = SKILL_KEYWORDS.filter((skill) => {
    const pattern = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    return regex.test(descriptionText);
  });

  // --- Title ---
  let title = "";
  if (selectors) {
    title = safeText(selectors.title);
  }
  if (!title) {
    title = document.title.split("|")[0].split("-")[0].trim();
  }

  // --- Company ---
  let company = "";
  if (selectors) {
    company = safeText(selectors.company);
  }
  if (!company) {
    const titleParts = document.title.split(/[|\-–—]/);
    company = titleParts.length > 1 ? titleParts[1].trim() : "Unknown";
  }

  return {
    title,
    company,
    url: window.location.href,
    skills: foundSkills,
    timestamp: Date.now(),
    source: site || window.location.hostname
  };
}

// ============================================================
// Initialization & SPA Navigation Watcher
// ============================================================

let lastScrapedUrl = "";

function scrapeAndSend() {
  const jobData = extractJobData();

  if (jobData.skills.length > 0) {
    chrome.runtime.sendMessage({ type: "JOB_SCRAPED", data: jobData });
    lastScrapedUrl = window.location.href;
    console.log("[SkillOS] Scraped job data:", jobData);
  }
}

// Initial scrape after page settles
setTimeout(scrapeAndSend, 2500);

// SPA navigation watcher — re-scrape when URL changes
setInterval(() => {
  if (window.location.href !== lastScrapedUrl) {
    scrapeAndSend();
  }
}, 2000);
