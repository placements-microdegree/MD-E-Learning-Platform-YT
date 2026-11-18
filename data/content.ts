import { asset } from "@/lib/assetPath";
import type { TrackIconName } from "@/components/icons/TrackIcons";

export const CERTIFICATE_IMAGE = asset("/images/certificate.webp");

export const navLinks = [
  { href: "#courses", label: "Courses" },
  { href: "#testimonials", label: "Reviews" },
  { href: "#certificate", label: "Certificate" },
  { href: "#faq", label: "FAQ" },
];

export const socialLinks = [
  { platform: "instagram", label: "Instagram", href: "https://www.instagram.com/microdegree.work/?hl=en" },
  { platform: "youtube", label: "YouTube", href: "https://www.youtube.com/channel/UCu8l4v6xqQd8LfOfd0kMPsA" },
  { platform: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/microdegree/?viewAsMember=true" },
  { platform: "x", label: "X", href: "https://x.com/micro_degree" },
  { platform: "facebook", label: "Facebook", href: "https://www.facebook.com/MicroDegree-101072281390361/?modal=admin_todo_tour" },
];

export const trustHighlights = [
  { value: "1 Lakh+", label: "Learners", logo: asset("/images/1lakh.webp") },
  { value: "Govt. of Karnataka", label: "Elevate Startup Winner 2020", logo: asset("/images/startup_gok.webp") },
  { value: "90K+", label: "YouTube Subscribers", logo: asset("/images/ytlogo.webp") },
  {
    value: "Somaiya Vidyavihar",
    label: "Backed By",
    logo: asset("/images/somaiya-vidyavihar-university-logo-png_seeklogo-458416.webp"),
  },
  { value: "100x.VC", label: "Backed By", logo: asset("/images/100xvc.webp") },
];

export const trust = [
  {
    title: "Tech Harate community",
    image: asset("/images/techharate.webp"),
    heading: "Kannada Tech Community, Live",
    caption: "Tech Harate meetups bring Kannadiga engineers together to learn, network and grow, in person.",
  },
  {
    title: "MicroDegree, featured on Josh Talks",
    image: asset("/images/joshtalk.webp"),
    heading: "Featured on Josh Talks",
    caption: "Our mission to teach tech in Kannada was featured on India's biggest storytelling platform.",
  },
  {
    title: "Featured in The New Indian Express",
    image: asset("/images/news1.webp"),
    heading: "Featured in The New Indian Express",
    caption: "Press coverage on how MicroDegree brings job-ready tech skills to Kannada speakers.",
  },
  {
    title: "Google reviews",
    image: asset("/images/goolereview.webp"),
    heading: "Loved by Learners on Google",
    caption: "Hundreds of verified 5-star reviews from learners who built real tech careers with us.",
  },
  {
    title: "Team MicroDegree",
    image: asset("/images/teammicrodegree.webp"),
    heading: "Meet the Team Behind MicroDegree",
    caption: "Mentors and engineers building Karnataka's largest Kannada-first tech-skilling community.",
  },
  {
    title: "LinkedIn reviews",
    image: asset("/images/linkedinrev.webp"),
    heading: "Certified. Hired. Celebrated.",
    caption: "Learners proudly share their MicroDegree certifications and career wins on LinkedIn.",
  },
];

export type Plan = {
  name: string;
  blurb: string;
  price: string;
  priceUnit: string;
  originalPrice?: string;
  discount?: string;
  offer?: string;
  // Billing-period toggle — parked for a later launch, keep the shape here.
  // priceOptions?: { label: string; price: string; originalPrice?: string; discount?: string; priceUnit: string }[];
  count: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  accent: string;
  shell: string;
  headerBg: string;
  shadow: string;
  btnBg: string;
  btnBorder: string;
  btnColor: string;
  btnShadow: string;
  cta: string;
  href: string;
  level: string;
  highlights: string[];
  tracks: { label: string; icon: TrackIconName; locked?: boolean }[];
  curriculum: { track: string; topics: string[] }[];
  certificateIncluded: boolean;
};

const sharedHighlights = [
  "Self Paced Recorded Sessions",
  "Learn at Your Pace",
  "By Industry Experts",
  "Learn 10x Faster in Kannada",
];

export function buildPlans(ctaLabel: string, checkoutUrl: string, freeCourseUrl: string): Plan[] {
  return [
    {
      name: "Free Plan",
      blurb: "Start from zero, free of cost.",
      price: "₹0",
      priceUnit: "forever free",
      count: "75+",
      badge: "free",
      badgeBg: "#17121F",
      badgeColor: "#FFFFFF",
      accent: "#4B1BE0",
      shell: "rgba(23,18,31,0.10)",
      headerBg: "linear-gradient(140deg,#4B1BE0,#7C3AED)",
      shadow: "0 10px 28px rgba(45,15,120,0.06)",
      btnBg: "#FFFFFF",
      btnBorder: "1px solid rgba(75,27,224,0.35)",
      btnColor: "#4415C7",
      btnShadow: "none",
      cta: "Start Learning for Free",
      href: freeCourseUrl,
      level: "Beginner Level",
      highlights: ["10 Course Cards", "75+ Video Lessons", ...sharedHighlights],
      tracks: [
        { label: "AWS", icon: "aws" },
        { label: "DevOps", icon: "devops" },
        { label: "DevSecOps", icon: "devsecops" },
        { label: "Networking", icon: "networking" },
        { label: "Linux", icon: "linux" },
        { label: "Azure", icon: "azure" },
        { label: "CKA", icon: "kubernetes" },
        { label: "GenAI", icon: "genai" },
        { label: "GenAI for Cloud & DevOps", icon: "genai" },
        { label: "Roadmap to Cloud & DevOps", icon: "roadmap" },
        { label: "Interview Prep Q&A", icon: "qa", locked: true },
        { label: "Quick Interview Cheat Sheet", icon: "cheatsheet", locked: true },
        { label: "Interview E-Book", icon: "ebook", locked: true },
      ],
      curriculum: [
        {
          track: "AWS",
          topics: [
            "Introduction to Cloud Computing", "AWS Account Setup", "AWS Networking", "IP Addressing",
            "NAT Gateway", "Cloud Models & AWS Regions",
          ],
        },
        {
          track: "DevOps",
          topics: [
            "DevOps Fundamentals", "CI/CD Fundamental", "Git & Version Control", "GitHub Fundamentals",
          ],
        },
        {
          track: "DevSecOps",
          topics: [
            "DevSecOps Fundamentals", "Information Security Fundamentals", "Application Security Testing",
            "Security Architecture & Compliance", "OWASP Top 10", "Linux & SSH Security",
          ],
        },
        {
          track: "Networking",
          topics: ["Networking Fundamentals", "Network Topologies & Protocols", "Network Layers"],
        },
        {
          track: "Linux",
          topics: ["Linux Fundamentals & Architecture", "Linux Filesystem", "Linux Commands & CLI"],
        },
        {
          track: "Azure",
          topics: [
            "Cloud Computing Fundamentals", "Azure Fundamentals", "Azure Marketplace",
            "Azure Resource Management", "Virtual Machines", "Azure VM Types, Selection & Configuration",
          ],
        },
        {
          track: "CKA",
          topics: [
            "Kubernetes Fundamentals & Architecture", "Kubernetes Control Plane", "Kubernetes Worker Nodes",
            "Kube-proxy & Container Runtime", "Kubernetes Objects", "Kubernetes Installation",
          ],
        },
        {
          track: "GenAI",
          topics: [
            "AI, ML, DL & GenAI", "Evolution of AI", "AI Models", "Open-Source Models", "Machine Learning",
            "ML Lifecycle", "Feature Engineering", "Linear Regression", "LLMs & Generative AI",
            "Generative AI Tools",
          ],
        },
        {
          track: "GenAI for Cloud & DevOps",
          topics: [
            "Generative AI Fundamentals", "LLM Concepts & Architecture", "Prompt Engineering",
            "Few-Shot & In-Context Learning", "AI Productivity & Workflows",
          ],
        },
      ],
      certificateIncluded: false,
    },
    {
      name: "Premium Plan",
      blurb: "For a cloud, DevOps or AI role this year.",
      price: "₹399",
      priceUnit: "for 2 months access",
      originalPrice: "₹1,999",
      discount: "80% OFF",
      offer: "Limited Time Offer",
      // Billing-period toggle — parked for a later launch.
      // priceOptions: [
      //   { label: "2 Month", price: "₹399", originalPrice: "₹1,999", discount: "80% OFF", priceUnit: "for 2 months" },
      //   { label: "Yearly", price: "₹1,999", originalPrice: "₹5,999", discount: "67% OFF", priceUnit: "per year" },
      // ],
      count: "200+",
      badge: "Full Curriculum",
      badgeBg: "#FA1055",
      badgeColor: "#FFFFFF",
      accent: "#FA1055",
      shell: "linear-gradient(140deg,#4B1BE0,#FA1055)",
      headerBg: "linear-gradient(140deg,#4B1BE0,#FA1055)",
      shadow: "0 26px 60px rgba(75,27,224,0.22)",
      btnBg: "linear-gradient(120deg,#4B1BE0,#FA1055)",
      btnBorder: "1px solid transparent",
      btnColor: "#FFFFFF",
      btnShadow: "0 12px 30px rgba(75,27,224,0.30)",
      cta: ctaLabel,
      href: checkoutUrl,
      level: "Advance Level",
      highlights: ["10 Course Cards", "250+ Video Lessons", ...sharedHighlights],
      tracks: [
        { label: "AWS", icon: "aws" },
        { label: "DevOps", icon: "devops" },
        { label: "DevSecOps", icon: "devsecops" },
        { label: "Networking", icon: "networking" },
        { label: "Linux", icon: "linux" },
        { label: "Azure", icon: "azure" },
        { label: "CKA", icon: "kubernetes" },
        { label: "GenAI", icon: "genai" },
        { label: "GenAI for Cloud & DevOps", icon: "genai" },
        { label: "Roadmap to Cloud & DevOps", icon: "roadmap" },
        { label: "Interview Prep Q&A", icon: "qa" },
        { label: "Quick Interview Cheat Sheet", icon: "cheatsheet" },
        { label: "Interview E-Book", icon: "ebook" },
      ],
      curriculum: [
        {
          track: "AWS",
          topics: [
            "VPC", "Public & Private Subnets", "VPC Configuration", "Security Groups & NACLs",
            "EC2 Fundamentals", "EC2 Deployment & Scaling", "VPC Peering", "Backup & Disaster Recovery",
            "CloudTrail, CLI & IAM",
          ],
        },
        {
          track: "DevOps",
          topics: [
            "Docker", "Dockerfiles", "Docker Networking", "Docker Swarm", "Jenkins",
            "Jenkins Pipelines & Automation",
          ],
        },
        {
          track: "DevSecOps",
          topics: [
            "CVE Analysis", "CVSS & Risk Scoring", "EPSS & Risk Assessment", "CIS Controls", "CISA KEV",
            "Trivy & Vulnerability Scanning", "Docker Image Security", "IaC Security",
          ],
        },
        {
          track: "Networking",
          topics: ["OSI Model", "IP Addressing", "IPv4 & IPv6", "CIDR & Subnetting"],
        },
        {
          track: "Linux",
          topics: [
            "Advanced CLI", "Shell Scripting", "Shell Scripting Automation", "Control Flow & Conditions",
          ],
        },
        {
          track: "Azure",
          topics: [
            "Azure VMs & Web Servers", "VM Automation & User Data", "Network Security Groups",
            "VM Snapshots, Scale Sets & Scaling", "Azure Load Balancer & Application Gateway", "Azure Storage",
            "Azure Blob Storage & Lifecycle Management", "Azure SQL Database", "Azure Functions & Serverless",
          ],
        },
        {
          track: "CKA",
          topics: [
            "Kubernetes Setup & Networking", "Pods & Workloads", "Namespaces & Resource Management",
            "Services & Networking", "Storage, Security & Scaling",
          ],
        },
        {
          track: "GenAI",
          topics: [
            "Prompt Engineering", "AI & Model Architecture", "RAG & Vector Databases", "AI Agents & LangChain",
            "Multi-Agent Systems & MCP",
          ],
        },
        {
          track: "GenAI for Cloud & DevOps",
          topics: [
            "n8n AI Automation", "Local LLMs with Ollama", "LLM Safety & Guardrails", "LLM Hallucinations",
            "RAG Fundamentals",
          ],
        },
      ],
      certificateIncluded: true,
    },
  ];
}

export const whyMicroDegree = ["10x Faster in Kannada", "Learn by Doing", "Built for IT Professionals", "Global Tech, Local Learning"];

export const audiences = [
  { tag: "01", title: "IT professionals", body: "Upskill for your next high paying job in Cloud, DevOps or GenAI" },
  { tag: "02", title: "Fresher & Students", body: "Build practical skills, before entering the job market." },
  { tag: "03", title: "Semi IT Professionals", body: "Move from support, operations roles to technology." },
];

export const careerFromRoles = [
  "IT Support",
  "Developer",
  "Manual Tester",
  "System Admin",
  "DevOps",
  "System Engineer",
  "Network Engineer",
  "Scrum Master",
  "Project Manager",
];

export const careerToTracks = [
  {
    title: "Cloud Roles",
    roles: ["Cloud Engineer", "Site Reliability Engineer", "Platform Engineer"],
  },
  {
    title: "DevOps Roles",
    roles: ["DevOps Engineer", "CI/CD Engineer", "Automation Engineer"],
  },
  {
    title: "GenAI Roles",
    roles: ["AI Engineer", "Generative AI Engineer", "Agentic AI Engineer"],
  },
];

export type Review = {
  name: string;
  text: string;
  stars?: number;
  source: "google" | "linkedin";
  href: string;
};

export const googleReviews: Review[] = [
  {
    name: "Avila BS",
    text: "I had a great experience attending the AWS session. The content was well structured, practical and easy to understand. A special mention to Chitharanjan, who is an excellent…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/EukFobi2aAscwU4a8",
  },
  {
    name: "Vineeth Shetty",
    text: "I had a great learning experience with MicroDegree while completing the AWS Solutions Architect and DevOps Engineer Trainee program. The training is highly practical and…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/XDEhcoF8WKwVDge3A",
  },
  {
    name: "Varun BC",
    text: "AWS class from Chitharanjan K sir. The trainer was knowledgeable, interactive, and explained the topics clearly. The practical examples and hands-on exercises made the…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/A7RzvmJ23EM9UJ697",
  },
  {
    name: "Tejas P",
    text: "Chithranjan sir explained the concepts of AWS very well and made us understand it, with live examples and live scenarios, which eventually made it easy for me to understand…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/THzrKUeTtsfgdccL6",
  },
  {
    name: "Sindhu Shree",
    text: "My mentor during my AWS learning journey was Chitharanjan. I had always been interested in learning AWS but never really pursued it, until now. His ability to simplify…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/omUcWiJTnN1Sa41y6",
  },
  {
    name: "Satish Pujari",
    text: "I am grateful to have completed my AWS DevOps course through MicroDegree. Special thanks to Mr. Sumeet Kulkarni for his excellent teaching. His explanations were clear and…",
    stars: 5,
    source: "google",
    href: "https://maps.app.goo.gl/6GP7NTJqBXSRNhaZA",
  },
];

export const linkedinReviews: Review[] = [
  {
    name: "Praveen V",
    text: "I'm happy to share that I have successfully completed the AWS Solution Architect certification from MicroDegree. This journey helped me strengthen my understanding of cloud…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7444647632452370432/",
  },
  {
    name: "Rahul I",
    text: "Excited to share that I've successfully completed the Azure Solutions Architect Expert MicroDegree! This journey strengthened my skills in cloud architecture, hands-on labs,…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7442167457772969985/",
  },
  {
    name: "Ramachandrarao Mane",
    text: "Excited to share a milestone! I'm happy to announce that I've successfully completed the GenAI Live Certification from MicroDegree. This journey helped me gain hands-on…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7448357654952853504/",
  },
  {
    name: "Vismaya BV",
    text: "Excited to share that I have successfully completed my AWS & DevOps Internship Program at MicroDegree! During this internship, I gained practical knowledge in AWS Cloud…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7437205069025935360/",
  },
  {
    name: "Sachin R",
    text: "Excited to share a milestone in my learning journey! I have successfully completed the GenAI for Cloud & DevOps program at MicroDegree. Through this program, I gained…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7440620217216700416/",
  },
  {
    name: "Sagar P.",
    text: "I'm happy to share that I have successfully completed my DevOps Course at MicroDegree. I gained hands-on knowledge across multiple DevOps tools and practices, working with…",
    source: "linkedin",
    href: "https://www.linkedin.com/feed/update/urn:li:activity:7438086161031438336/",
  },
];

export const googleReviewLoop = [...googleReviews, ...googleReviews];

export const linkedinCertScreenshots = [
  { src: asset("/images/linkedin_ss/linkedin-cert-1.webp"), alt: "Archana B S's DevOps Engineer certificate, shared on LinkedIn" },
  { src: asset("/images/linkedin_ss/linkedin-cert-2.webp"), alt: "Savio Rebello's Azure Solutions Architect certificate, shared on LinkedIn" },
  { src: asset("/images/linkedin_ss/linkedin-cert-3.webp"), alt: "Teja S B's AWS Solutions Architect certificate, shared on LinkedIn" },
  { src: asset("/images/linkedin_ss/linkedin-cert-4.webp"), alt: "Varshith A P's AWS Solutions Architect certificate, shared on LinkedIn" },
  { src: asset("/images/linkedin_ss/linkedin-cert-5.webp"), alt: "Lavanya B's DevOps Engineer certificate, shared on LinkedIn" },
  { src: asset("/images/linkedin_ss/linkedin-cert-6.webp"), alt: "Manjunath Jantagal's Generative AI Engineer certificate, shared on LinkedIn" },
];

export const certPoints = ["Resume value", "LinkedIn friendly", "Shareable link"];

export const faqs = [
  {
    q: "Will I receive a certificate?",
    a: "Yes, with the Premium plan. On completing a track you get a shareable, verifiable MicroDegree certificate. The Free plan does not include a certificate.",
  },
  {
    q: "How long will I have course access?",
    a: "The Free plan gives you 1 year of access. The Premium plan (₹399) includes 2 months of access to every track in the plan.",
  },
  {
    q: "Can I access the courses on mobile?",
    a: "Yes. MicroDegree works on mobile, web and tablet, so you can learn from anywhere, between shifts or on the go.",
  },
  {
    q: "Is any job or placement assistance included?",
    a: "No. MicroDegree is a pure upskilling platform, there is no placement program and no interview assistance. Our entire focus is helping you build real, job-ready skills.",
  },
  {
    q: "Are the sessions live or recorded?",
    a: "All courses are self-paced recorded video lessons. Start anytime, learn at your own speed, and rewatch any lesson as often as you need.",
  },
  {
    q: "What are the terms & conditions?",
    a: "If the course isn't right for you, tell us within 3 days of purchase for a 100% refund. Full enrolment terms are shared before payment and by email after you enroll.",
  },
];

export const heroStats = [
  { value: "1,00,000+", label: "learners" },
  { value: "90K+", label: "youtube" },
  { value: "200+", label: "courses" },
];
