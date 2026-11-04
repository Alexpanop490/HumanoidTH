import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Definition of page structures for SEO auditing
interface PageInfo {
  name: string;
  filePath: string;
  route: string;
  isPrivate: boolean;
}

const pages: PageInfo[] = [
  { name: "Overview", filePath: "app/page.tsx", route: "/", isPrivate: false },
  { name: "Robot Registry", filePath: "app/robots/page.tsx", route: "/robots", isPrivate: false },
  { name: "Perspectives", filePath: "app/perspectives/page.tsx", route: "/perspectives", isPrivate: false },
  { name: "Contributions", filePath: "app/contributions/page.tsx", route: "/contributions", isPrivate: false },
  { name: "Map", filePath: "app/map/page.tsx", route: "/map", isPrivate: false },
  { name: "Network", filePath: "app/network/page.tsx", route: "/network", isPrivate: false },
  { name: "Analytics", filePath: "app/analytics/page.tsx", route: "/analytics", isPrivate: false },
  { name: "Submit Data", filePath: "app/submit-data/page.tsx", route: "/submit-data", isPrivate: false },
  { name: "Inventory", filePath: "app/inventory/page.tsx", route: "/inventory", isPrivate: false },
  { name: "Admin Login", filePath: "app/admin-login/page.tsx", route: "/admin-login", isPrivate: true },
  { name: "Admin Review Console", filePath: "app/admin/page.tsx", route: "/admin", isPrivate: true },
  { name: "Admin Submitted Data", filePath: "app/admin/submitted-data/page.tsx", route: "/admin/submitted-data", isPrivate: true },
  { name: "Admin CMS", filePath: "app/admin/cms/page.tsx", route: "/admin/cms", isPrivate: true },
  { name: "Data Ingestion Control", filePath: "app/data-pulls/page.tsx", route: "/data-pulls", isPrivate: true }
];

interface AuditIssue {
  filePath: string;
  pageName: string;
  category: "metadata" | "html" | "links" | "performance" | "structured-data";
  message: string;
  severity: "high" | "medium" | "low";
  suggestedFix: string;
  isAutoFixable: boolean;
}

// Helper to extract Next.js metadata block
function extractMetadataBlock(content: string): { start: number; end: number; text: string } | null {
  const match = content.match(/export\s+const\s+metadata:\s+Metadata\s*=\s*\{/);
  if (!match || match.index === undefined) return null;
  const start = match.index;
  
  let braceCount = 0;
  let inString = false;
  let stringChar = "";
  let end = -1;
  
  for (let i = start; i < content.length; i++) {
    const char = content[i];
    // Simple string literal tracker to avoid counting braces inside strings
    if ((char === '"' || char === "'" || char === "`") && content[i-1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          let j = i + 1;
          while (j < content.length && (content[j] === ';' || content[j] === ' ' || content[j] === '\n' || content[j] === '\r')) {
            j++;
          }
          end = j;
          break;
        }
      }
    }
  }
  
  if (end !== -1) {
    return { start, end, text: content.substring(start, end) };
  }
  return null;
}

function extractStringValue(text: string, key: string): string | null {
  const regex = new RegExp(`${key}:\\s*(["'\`])([\\s\\S]*?)\\1`);
  const match = text.match(regex);
  if (match) {
    return match[2];
  }
  return null;
}

// Parses properties out of extracted metadata block
function parseMetadataProperties(metadataText: string) {
  const title = extractStringValue(metadataText, "title");
  const description = extractStringValue(metadataText, "description");
  const canonical = extractStringValue(metadataText, "canonical");
  const indexMatch = metadataText.match(/index:\s*(true|false)/);
  
  const hasOpenGraph = metadataText.includes("openGraph:");
  const hasTwitter = metadataText.includes("twitter:");
  
  return {
    title,
    description,
    canonical,
    noindex: indexMatch && indexMatch[1] === "false",
    hasOpenGraph,
    hasTwitter
  };
}

// Renders the fully optimized metadata block string
function generateOptimizedMetadata(page: PageInfo, title: string | null, desc: string | null, isPrivate: boolean) {
  const finalTitle = title || `${page.name} | Thailand Humanoid Atlas`;
  const finalDesc = desc || `Explore the Thailand Humanoid Atlas ${page.name.toLowerCase()} database for robotics, academics, and public perspectives in Thailand.`;
  const canonicalUrl = page.route;

  if (isPrivate) {
    return `export const metadata: Metadata = {
  title: "${finalTitle}",
  robots: { index: false, follow: false }
};`;
  }

  return `export const metadata: Metadata = {
  title: "${finalTitle}",
  description: "${finalDesc}",
  alternates: { canonical: "${canonicalUrl}" },
  openGraph: {
    title: "${finalTitle}",
    description: "${finalDesc}",
    url: "${canonicalUrl}",
    siteName: "Thailand Humanoid Atlas",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Thailand Humanoid Atlas Logo"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "${finalTitle}",
    description: "${finalDesc}",
    images: ["/logo.png"]
  }
};`;
}

// Automatically appends loading="lazy" to <img> tags missing it
function optimizeImgTags(content: string): { newContent: string; count: number } {
  let count = 0;
  const newContent = content.replace(/<img\s+(?![^>]*loading=)([^>]+)>/gi, (match, body) => {
    count++;
    return `<img loading="lazy" ${body}>`;
  });
  return { newContent, count };
}

async function runSeoAudit() {
  const issues: AuditIssue[] = [];
  const fixesApplied: { filePath: string; action: string }[] = [];
  
  console.log("=== Starting SEO and Web Optimization Audit ===");

  // Check Sitemap
  const sitemapPath = "app/sitemap.ts";
  if (!fs.existsSync(sitemapPath)) {
    issues.push({
      filePath: sitemapPath,
      pageName: "Global",
      category: "metadata",
      message: "Missing sitemap.ts file",
      severity: "high",
      suggestedFix: "Create app/sitemap.ts to dynamically serve sitemap.xml to crawlers",
      isAutoFixable: true
    });
  }

  // Check Robots
  const robotsPath = "app/robots.ts";
  if (!fs.existsSync(robotsPath)) {
    issues.push({
      filePath: robotsPath,
      pageName: "Global",
      category: "metadata",
      message: "Missing robots.ts file",
      severity: "high",
      suggestedFix: "Create app/robots.ts to dynamically serve robots.txt rules",
      isAutoFixable: true
    });
  }

  // Check LLMs text
  const llmsPath = "public/llms.txt";
  if (!fs.existsSync(llmsPath)) {
    issues.push({
      filePath: llmsPath,
      pageName: "Global",
      category: "metadata",
      message: "Missing public/llms.txt file for AI visibility",
      severity: "medium",
      suggestedFix: "Create public/llms.txt containing structured plain text platform overview for LLM search indexing",
      isAutoFixable: true
    });
  }

  // Audit Pages
  for (const page of pages) {
    if (!fs.existsSync(page.filePath)) {
      continue;
    }

    const content = fs.readFileSync(page.filePath, "utf-8");

    // 1. Heading Audit (exactly one <h1> per page component, excluding layouts)
    const h1Matches = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/g);
    if (!h1Matches) {
      if (page.filePath !== "app/admin/cms/page.tsx" && page.filePath !== "app/admin/submitted-data/page.tsx") {
        issues.push({
          filePath: page.filePath,
          pageName: page.name,
          category: "html",
          message: "Missing h1 heading element",
          severity: "medium",
          suggestedFix: "Add exactly one clear <h1> tag introducing the page contents",
          isAutoFixable: false
        });
      }
    } else if (h1Matches.length > 1) {
      issues.push({
        filePath: page.filePath,
        pageName: page.name,
        category: "html",
        message: `Multiple h1 headings detected (${h1Matches.length})`,
        severity: "medium",
        suggestedFix: "Reduce heading structure to exactly one <h1> element per page. Use <h2> and <h3> for nested subheadings",
        isAutoFixable: false
      });
    }

    // 2. Image Audit
    const imgMatches = content.match(/<img\s+([^>]+)>/gi);
    if (imgMatches) {
      for (const imgTag of imgMatches) {
        if (!imgTag.includes("alt=")) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "performance",
            message: `Image tag missing alt text: ${imgTag}`,
            severity: "medium",
            suggestedFix: "Add a descriptive alt text attribute to satisfy accessibility and SEO criteria",
            isAutoFixable: false
          });
        }
        if (!imgTag.includes("loading=")) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "performance",
            message: `Image tag missing loading='lazy' attribute: ${imgTag}`,
            severity: "low",
            suggestedFix: "Add loading='lazy' to prevent rendering layout shifts and speed up loads",
            isAutoFixable: true
          });
        }
      }
    }

    // 3. Metadata Audit
    const metaBlock = extractMetadataBlock(content);
    if (!metaBlock) {
      issues.push({
        filePath: page.filePath,
        pageName: page.name,
        category: "metadata",
        message: "Missing export const metadata definition",
        severity: "high",
        suggestedFix: "Export a metadata object defining title, description, and canonical URLs",
        isAutoFixable: true
      });
    } else {
      const meta = parseMetadataProperties(metaBlock.text);

      // Check title
      if (!meta.title) {
        issues.push({
          filePath: page.filePath,
          pageName: page.name,
          category: "metadata",
          message: "Metadata is missing a title tag",
          severity: "high",
          suggestedFix: "Provide a unique title string matching platform keywords",
          isAutoFixable: true
        });
      } else if (meta.title.length < 15 || meta.title.length > 70) {
        issues.push({
          filePath: page.filePath,
          pageName: page.name,
          category: "metadata",
          message: `Metadata title length is suboptimal: '${meta.title}' (${meta.title.length} chars)`,
          severity: "low",
          suggestedFix: "Optimize title tag to be between 20 and 65 characters",
          isAutoFixable: true
        });
      }

      // Check description (skip for private pages)
      if (!page.isPrivate) {
        if (!meta.description) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "metadata",
            message: "Metadata is missing a description tag",
            severity: "high",
            suggestedFix: "Provide a descriptive meta description outlining the page contents",
            isAutoFixable: true
          });
        } else if (meta.description.length < 80 || meta.description.length > 200) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "metadata",
            message: `Metadata description length is suboptimal (${meta.description.length} chars)`,
            severity: "low",
            suggestedFix: "Optimize meta description to be between 100 and 160 characters",
            isAutoFixable: true
          });
        }

        // Check canonical
        if (!meta.canonical) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "metadata",
            message: "Metadata is missing alternates.canonical URL configuration",
            severity: "medium",
            suggestedFix: "Add alternates: { canonical: '/route' } to prevent search engines indexing duplicate parameters",
            isAutoFixable: true
          });
        }

        // Check OpenGraph & Twitter
        if (!meta.hasOpenGraph || !meta.hasTwitter) {
          issues.push({
            filePath: page.filePath,
            pageName: page.name,
            category: "metadata",
            message: "Missing Open Graph or Twitter Card social configuration",
            severity: "medium",
            suggestedFix: "Embed openGraph and twitter objects containing sharing metadata fields",
            isAutoFixable: true
          });
        }
      }

      // Check robots tag on private pages
      if (page.isPrivate && !meta.noindex) {
        issues.push({
          filePath: page.filePath,
          pageName: page.name,
          category: "metadata",
          message: "Private/Admin page is indexable (missing robots: noindex)",
          severity: "high",
          suggestedFix: "Configure robots: { index: false, follow: false } in metadata object",
          isAutoFixable: true
        });
      }
    }

    // 4. Structured Data
    if (!page.isPrivate && page.route === "/") {
      if (!content.includes("application/ld+json")) {
        issues.push({
          filePath: page.filePath,
          pageName: page.name,
          category: "structured-data",
          message: "Homepage is missing JSON-LD structured data",
          severity: "medium",
          suggestedFix: "Embed schema.org WebSite, WebApplication, or Organization schema data",
          isAutoFixable: true
        });
      }
    }

    // 5. Link Validation (broken internal links)
    const hrefMatches = content.match(/href=["'](\/[^"']+)["']/g);
    if (hrefMatches) {
      for (const match of hrefMatches) {
        const href = match.match(/href=["']([^"']+)["']/)?.[1] || "";
        const route = href.split("?")[0].split("#")[0];
        
        // Validate internal routes (excluding external parameters, static files or anchors)
        if (route.startsWith("/") && !route.startsWith("/api/")) {
          const isValidRoute = pages.some(p => p.route === route) || 
                               route === "/profile" || 
                               route === "/dashboard" || 
                               route === "/database";
          if (!isValidRoute) {
            issues.push({
              filePath: page.filePath,
              pageName: page.name,
              category: "links",
              message: `Broken internal link detected: href='${href}'`,
              severity: "high",
              suggestedFix: `Update link href to reference a valid project route`,
              isAutoFixable: false
            });
          }
        }
      }
    }
  }

  return issues;
}

function applyOptimizations(issues: AuditIssue[]) {
  const backups: Record<string, string> = {};
  const backupDir = path.join("scripts", ".seo-backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log("\n=== Applying Safe Auto-Improvements ===");

  try {
    // 1. Generate fallback files if missing
    // Robots.ts
    const robotsPath = "app/robots.ts";
    if (issues.some(i => i.filePath === robotsPath)) {
      console.log(`- Creating ${robotsPath}...`);
      const defaultRobots = `import { MetadataRoute } from "next";\n\nexport default function robots(): MetadataRoute.Robots {\n  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://humanoid.or.th";\n  return {\n    rules: {\n      userAgent: "*",\n      allow: "/",\n      disallow: ["/admin", "/admin-login", "/admin/cms", "/admin/submitted-data", "/api/", "/data-pulls"]\n    },\n    sitemap: \`\${baseUrl}/sitemap.xml\`\n  };\n}\n`;
      fs.writeFileSync(robotsPath, defaultRobots, "utf-8");
    }

    // Sitemap.ts
    const sitemapPath = "app/sitemap.ts";
    if (issues.some(i => i.filePath === sitemapPath)) {
      console.log(`- Creating ${sitemapPath}...`);
      const defaultSitemap = `import { MetadataRoute } from "next";\n\nexport default async function sitemap(): Promise<MetadataRoute.Sitemap> {\n  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://humanoid.or.th";\n  const routes = ["", "/robots", "/perspectives", "/contributions", "/map", "/network", "/analytics", "/inventory", "/submit-data"];\n  return routes.map((route) => ({\n    url: \`\${baseUrl}\${route}\`,\n    lastModified: new Date(),\n    changeFrequency: "daily",\n    priority: route === "" ? 1.0 : 0.8\n  }));\n}\n`;
      fs.writeFileSync(sitemapPath, defaultSitemap, "utf-8");
    }

    // llms.txt
    const llmsPath = "public/llms.txt";
    if (issues.some(i => i.filePath === llmsPath)) {
      console.log(`- Creating ${llmsPath}...`);
      const defaultLlms = `# Thailand Humanoid Atlas\n\nResearch database cataloging humanoid robotics and embodied AI research, components, and inventory in Thailand.\n\n## Important Pages\n- Home: https://humanoid.or.th/\n- Robot Models: https://humanoid.or.th/robots\n`;
      fs.writeFileSync(llmsPath, defaultLlms, "utf-8");
    }

    // 2. Modify existing page files
    for (const page of pages) {
      if (!fs.existsSync(page.filePath)) continue;

      let content = fs.readFileSync(page.filePath, "utf-8");
      let originalContent = content;
      let modified = false;

      // Extract existing metadata properties
      const metaBlock = extractMetadataBlock(content);
      const fixableIssuesForPage = issues.filter(i => i.filePath === page.filePath && i.isAutoFixable);

      if (fixableIssuesForPage.length > 0) {
        // Backup file
        const backupPath = path.join(backupDir, page.filePath.replace(/[\/\\:]/g, "_") + ".bak");
        fs.writeFileSync(backupPath, originalContent, "utf-8");
        backups[page.filePath] = backupPath;

        // Auto-fix metadata
        if (metaBlock) {
          const parsed = parseMetadataProperties(metaBlock.text);
          // Only optimize if missing description, alternates, openGraph, or has invalid config
          const needsMetaFix = !parsed.canonical || !parsed.hasOpenGraph || !parsed.description || (page.isPrivate && !parsed.noindex);
          
          if (needsMetaFix) {
            console.log(`- Optimizing metadata configuration in ${page.filePath}...`);
            const optimizedBlock = generateOptimizedMetadata(page, parsed.title, parsed.description, page.isPrivate);
            content = content.replace(metaBlock.text, optimizedBlock);
            modified = true;
          }
        } else {
          // If completely missing metadata, append standard metadata imports and definition
          console.log(`- Adding metadata block to ${page.filePath}...`);
          const optimizedBlock = generateOptimizedMetadata(page, null, null, page.isPrivate);
          // Find import section and insert declaration
          const importIndex = content.lastIndexOf("import ");
          const insertIndex = content.indexOf("\n", importIndex);
          content = content.slice(0, insertIndex) + `\n${optimizedBlock}\n` + content.slice(insertIndex);
          modified = true;
        }

        // Auto-fix images (loading="lazy")
        const imgOpt = optimizeImgTags(content);
        if (imgOpt.count > 0) {
          console.log(`- Appended loading="lazy" to ${imgOpt.count} image tags in ${page.filePath}`);
          content = imgOpt.newContent;
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(page.filePath, content, "utf-8");
        }
      }
    }

    // 3. Post-Fix Verification (compile check)
    console.log("\n=== Verifying code compilation check ===");
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    console.log("✔ Validation Successful. Codebase compiles perfectly.");

    // Clean up backups on success
    for (const file in backups) {
      if (fs.existsSync(backups[file])) {
        fs.unlinkSync(backups[file]);
      }
    }
    fs.rmdirSync(backupDir);

  } catch (error) {
    console.error("\n❌ ERROR: Optimization check failed, rolling back changes to prevent compilation errors!", error);
    
    // Revert all modified files
    for (const originalPath in backups) {
      const backupPath = backups[originalPath];
      if (fs.existsSync(backupPath)) {
        console.log(`- Restoring ${originalPath} from backup...`);
        fs.copyFileSync(backupPath, originalPath);
        fs.unlinkSync(backupPath);
      }
    }
    
    try {
      if (fs.existsSync(backupDir)) {
        fs.rmdirSync(backupDir);
      }
    } catch {}
    
    process.exit(1);
  }
}

function generateReport(issues: AuditIssue[], isDryRun: boolean) {
  const highSeverity = issues.filter(i => i.severity === "high").length;
  const mediumSeverity = issues.filter(i => i.severity === "medium").length;
  const lowSeverity = issues.filter(i => i.severity === "low").length;

  const score = Math.max(0, 100 - (highSeverity * 15) - (mediumSeverity * 7) - (lowSeverity * 2));
  
  const reportData = {
    timestamp: new Date().toISOString(),
    score,
    isDryRun,
    summary: {
      totalIssues: issues.length,
      highSeverity,
      mediumSeverity,
      lowSeverity
    },
    issues: issues.map(i => ({
      filePath: i.filePath,
      pageName: i.pageName,
      category: i.category,
      message: i.message,
      severity: i.severity,
      suggestedFix: i.suggestedFix,
      isAutoFixable: i.isAutoFixable
    }))
  };

  // Write JSON report
  fs.writeFileSync("seo-report.json", JSON.stringify(reportData, null, 2), "utf-8");
  console.log("✔ Saved seo-report.json");

  // Write Markdown report
  let md = `# SEO & Web Optimization Report\n\n`;
  md += `*Generated: ${new Date().toLocaleString()}*\n\n`;
  md += `## Overall Health Score\n\n`;
  md += `### Score: **${score}/100**\n\n`;
  md += `*Health index calculated based on severity of unresolved technical issues.*\n\n`;
  
  md += `## Summary of Audited Parameters\n\n`;
  md += `| Parameter | Status |\n`;
  md += `| --- | --- |\n`;
  md += `| Sitemap xml | ${fs.existsSync("app/sitemap.ts") ? "✅ OK" : "❌ Missing sitemap.ts"} |\n`;
  md += `| Robots txt | ${fs.existsSync("app/robots.ts") ? "✅ OK" : "❌ Missing robots.ts"} |\n`;
  md += `| AI Visibility (llms.txt) | ${fs.existsSync("public/llms.txt") ? "✅ OK" : "❌ Missing public/llms.txt"} |\n`;
  md += `| Total Audited Public Routes | ${pages.filter(p => !p.isPrivate).length} |\n`;
  md += `| Total Active Issues | ${issues.length} (${highSeverity} high, ${mediumSeverity} medium, ${lowSeverity} low) |\n\n`;

  md += `## Issue Registry\n\n`;
  if (issues.length === 0) {
    md += `🎉 **Zero SEO issues found! Your website is fully optimized for search crawlers and AI search systems.**\n`;
  } else {
    md += `| Severity | Page | Category | Message | Recommendation | Auto-Fixable |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;
    for (const issue of issues) {
      const severityIcon = issue.severity === "high" ? "🔴 High" : issue.severity === "medium" ? "🟡 Med" : "🟢 Low";
      md += `| ${severityIcon} | ${issue.pageName} | \`${issue.category}\` | ${issue.message} | ${issue.suggestedFix} | ${issue.isAutoFixable ? "Yes" : "No"} |\n`;
    }
  }

  md += `\n## Optimization Strategy & Safety Rules\n\n`;
  md += `1. **No-Crash Guarantee**: The optimizer verifies structural TypeScript compilation after applying changes. If type-checking fails, changes are instantly reverted.\n`;
  md += `2. **Low-Risk Only**: Only metadata blocks, canonical fields, and image layout loading descriptors are auto-adjusted. Layout structure is never altered programmatically.\n`;
  md += `3. **AI Search Readiness**: Public routing utilizes static/server-rendered content summaries so crawler parsers (e.g. ChatGPT, Perplexity) receive immediate text.\n`;

  fs.writeFileSync("seo-report.md", md, "utf-8");
  console.log("✔ Saved seo-report.md");
  
  console.log("\n=== Audit Report Summary ===");
  console.log(`SEO Health Score: ${score}/100`);
  console.log(`Issues Found: ${issues.length} (High: ${highSeverity}, Med: ${mediumSeverity}, Low: ${lowSeverity})`);
}

// MAIN CLI ENTRYPOINT
async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  
  const issues = await runSeoAudit();
  
  if (isApply) {
    const fixable = issues.filter(i => i.isAutoFixable);
    if (fixable.length > 0) {
      applyOptimizations(issues);
      // Re-run audit to generate correct final report
      const remainingIssues = await runSeoAudit();
      generateReport(remainingIssues, false);
      console.log("\n✔ Applied all safe optimizations successfully.");
    } else {
      generateReport(issues, false);
      console.log("\nNo auto-fixable issues detected.");
    }
  } else {
    generateReport(issues, true);
    console.log("\n*** Dry-run mode completed. Run with '--apply' flag to execute safe automatic changes. ***");
  }
}

main().catch(err => {
  console.error("FATAL: SEO Optimization script failed", err);
  process.exit(1);
});
