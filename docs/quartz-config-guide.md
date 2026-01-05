# Quartz Configuration Guide

This guide helps you configure Quartz specifically for the Decision Risk Engine documentation.

## 📦 Installation

### Step 1: Install Quartz

```bash
# Clone Quartz v4
git clone https://github.com/jackyzha0/quartz.git my-docs-site
cd my-docs-site
npm install
```

### Step 2: Deploy Documentation

Use the provided deployment script:

```bash
# From your project root
./docs/deploy-to-quartz.sh ~/my-docs-site
```

Or manually copy files:

```bash
# Copy all documentation
cp -r /Users/hrithikthakur/Code/project1/docs/* ~/my-docs-site/content/
cp /Users/hrithikthakur/Code/project1/*.md ~/my-docs-site/content/
# ... (see deploy-to-quartz.sh for complete list)
```

---

## ⚙️ Configuration

### Main Configuration File: `quartz.config.ts`

Create or edit `quartz.config.ts` in your Quartz installation root:

```typescript
import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration for Decision Risk Engine Documentation
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Decision Risk Engine Docs",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "docs.example.com", // Change to your domain
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Inter",
        body: "Inter",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e8e8e8",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#1e6bb8",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
        darkMode: {
          light: "#161618",
          lightgray: "#393639",
          gray: "#646464",
          darkgray: "#d4d4d4",
          dark: "#ebebec",
          secondary: "#7b97aa",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
```

---

## 🎨 Layout Configuration: `quartz.layout.ts`

Create or edit `quartz.layout.ts`:

```typescript
import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// Components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  footer: Component.Footer({
    links: {
      "GitHub": "https://github.com/your-repo",
      "API Docs": "http://localhost:8000/docs",
    },
  }),
}

// Components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs(),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(
      Component.Explorer({
        title: "Documentation",
        folderClickBehavior: "collapse",
        folderDefaultState: "collapsed",
        useSavedState: true,
        mapFn: (node) => {
          // Customize folder names for better display
          if (node.name === "getting-started") {
            node.displayName = "🚀 Getting Started"
          } else if (node.name === "forecast-engine") {
            node.displayName = "📊 Forecast Engine"
          } else if (node.name === "decision-risk-engine") {
            node.displayName = "🎯 Decision-Risk Engine"
          } else if (node.name === "features") {
            node.displayName = "🔧 Features"
          }
        },
      })
    ),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// Components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(Component.Explorer()),
  ],
  right: [],
}
```

---

## 🎯 Custom Components

### Custom Home Page Header

Create `quartz/components/CustomHeader.tsx`:

```tsx
import { QuartzComponent, QuartzComponentConstructor } from "./types"

export default (() => {
  const CustomHeader: QuartzComponent = () => {
    return (
      <div class="custom-header">
        <h1>Decision Risk Engine</h1>
        <p>Monte Carlo simulation engine for forecasting with decision and risk analysis</p>
        <div class="quick-links">
          <a href="/QUICKSTART">Quick Start</a>
          <a href="/FORECAST_ENGINE_INDEX">Forecast Engine</a>
          <a href="/backend/DECISION_RISK_ENGINE_INDEX">Decision-Risk Engine</a>
        </div>
      </div>
    )
  }

  return CustomHeader
}) satisfies QuartzComponentConstructor
```

Add custom styles in `quartz/styles/custom.scss`:

```scss
.custom-header {
  text-align: center;
  padding: 2rem 0;
  border-bottom: 2px solid var(--lightgray);
  margin-bottom: 2rem;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: var(--dark);
  }

  p {
    font-size: 1.2rem;
    color: var(--gray);
    margin-bottom: 1.5rem;
  }

  .quick-links {
    display: flex;
    gap: 1rem;
    justify-content: center;
    
    a {
      padding: 0.5rem 1.5rem;
      background: var(--secondary);
      color: white;
      border-radius: 4px;
      text-decoration: none;
      transition: background 0.2s;

      &:hover {
        background: var(--tertiary);
      }
    }
  }
}
```

---

## 🔧 Advanced Features

### 1. Custom Search Configuration

Edit search settings in `quartz.config.ts`:

```typescript
Plugin.Search({
  enablePreview: true,
  searchOptions: {
    enableResultHighlight: true,
    shouldSort: true,
    threshold: 0.5,
    ignoreLocation: true,
  },
})
```

### 2. Graph View Customization

```typescript
Plugin.Graph({
  localGraph: {
    drag: true,
    zoom: true,
    depth: 1,
    scale: 1.1,
    repelForce: 0.5,
    centerForce: 0.3,
    linkDistance: 30,
    fontSize: 0.6,
    opacityScale: 1,
    removeTags: [],
    showTags: true,
  },
  globalGraph: {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 0.5,
    centerForce: 0.3,
    linkDistance: 30,
    fontSize: 0.5,
    opacityScale: 1,
    removeTags: [],
    showTags: true,
  },
})
```

### 3. Enable Tags

Add tags to your markdown frontmatter:

```markdown
---
title: "Forecast Engine Quick Start"
tags:
  - forecast
  - quickstart
  - guide
---
```

### 4. Custom Callouts

Use in markdown:

```markdown
> [!info]
> This is an informational callout

> [!warning]
> This is a warning callout

> [!success]
> This is a success callout
```

---

## 🚀 Building and Deploying

### Local Preview

```bash
cd ~/my-docs-site
npx quartz build --serve
```

Visit: http://localhost:8080

### Build for Production

```bash
npx quartz build
```

Output will be in `public/` directory.

### Deploy Options

#### Option 1: GitHub Pages

```bash
npx quartz build --deploy github
```

#### Option 2: Netlify

1. Build: `npx quartz build`
2. Upload `public/` folder to Netlify
3. Or connect GitHub repo and set build command:
   - Build command: `npx quartz build`
   - Publish directory: `public`

#### Option 3: Vercel

1. Build: `npx quartz build`
2. Upload `public/` folder
3. Or connect GitHub repo with same build settings as Netlify

#### Option 4: Custom Server

```bash
npx quartz build
rsync -avz public/ user@server:/var/www/html/
```

---

## 📝 Content Organization

### Recommended Folder Structure

```
content/
├── index.md                           # Landing page
├── navigation.md                      # Site navigation
├── quick-reference.md                 # Quick reference guide
│
├── getting-started/
│   ├── README.md
│   ├── QUICKSTART.md
│   └── PYENV_SETUP.md
│
├── forecast-engine/
│   ├── FORECAST_ENGINE_INDEX.md       # Section hub
│   ├── FORECAST_ENGINE_QUICKSTART.md
│   ├── FORECAST_ENGINE_SUMMARY.md
│   ├── FORECAST_ENGINE_ARCHITECTURE.md
│   ├── FORECAST_ENGINE_DELIVERY.md
│   └── FORECAST_ENGINE_README.md
│
├── decision-risk-engine/
│   ├── DECISION_RISK_ENGINE_INDEX.md  # Section hub
│   └── ... (other files)
│
└── features/
    ├── dependencies/
    ├── risk-management/
    ├── scenarios/
    └── issues/
```

---

## 🎨 Styling Customization

### Custom CSS

Create `quartz/styles/custom.scss`:

```scss
// Custom colors
:root {
  --primary: #1e6bb8;
  --success: #28a745;
  --warning: #ffc107;
  --danger: #dc3545;
}

// Custom styles for code blocks
.code-block {
  background: var(--lightgray);
  border-left: 4px solid var(--primary);
  padding: 1rem;
  margin: 1rem 0;
}

// Style for quick start boxes
.quick-start-box {
  background: var(--highlight);
  border: 2px solid var(--secondary);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}

// Style for navigation cards
.nav-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;

  .card {
    padding: 1.5rem;
    border: 1px solid var(--lightgray);
    border-radius: 8px;
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    h3 {
      margin-top: 0;
      color: var(--primary);
    }
  }
}

// Responsive tables
table {
  width: 100%;
  overflow-x: auto;
  display: block;

  @media (min-width: 768px) {
    display: table;
  }
}

// Badge styles
.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 4px;
  
  &.success { background: var(--success); color: white; }
  &.warning { background: var(--warning); color: black; }
  &.info { background: var(--primary); color: white; }
}
```

Import in `quartz/styles/base.scss`:

```scss
@import "./custom.scss";
```

---

## 🔍 SEO Configuration

### Add to `quartz.config.ts`:

```typescript
configuration: {
  // ... other config
  meta: {
    description: "Complete documentation for the Decision Risk Engine - Monte Carlo simulation for forecasting with decision and risk analysis",
    keywords: ["monte carlo", "forecasting", "risk analysis", "decision analysis", "project management"],
    author: "Your Name",
    ogImage: "/og-image.png",
  },
}
```

### Create Open Graph Image

Place an image at `content/assets/og-image.png` (1200x630px recommended).

---

## 📊 Analytics Integration

### Google Analytics

```typescript
analytics: {
  provider: "google",
  tagId: "G-XXXXXXXXXX",
}
```

### Plausible Analytics

```typescript
analytics: {
  provider: "plausible",
  host: "https://plausible.io",
}
```

---

## 🐛 Troubleshooting

### Links Not Working
**Problem**: Internal links broken
**Solution**: Use relative paths with `.md` extension

```markdown
[Link](../FILE.md)  ✅
[Link](FILE)        ❌
```

### Images Not Loading
**Problem**: Images don't appear
**Solution**: Place in `content/assets/` and use relative paths

```markdown
![Image](./assets/image.png)  ✅
![Image](image.png)           ❌
```

### Build Errors
**Problem**: Build fails
**Solutions**:
1. Check for invalid markdown syntax
2. Ensure all referenced files exist
3. Remove circular references
4. Check frontmatter YAML is valid

### Search Not Finding Content
**Problem**: Search doesn't return results
**Solution**: Rebuild search index

```bash
npx quartz build --clean
npx quartz build
```

---

## ✅ Pre-Deployment Checklist

- [ ] All markdown files copied to `content/`
- [ ] `quartz.config.ts` configured
- [ ] `quartz.layout.ts` configured
- [ ] Custom styles added (if any)
- [ ] Test local preview: `npx quartz build --serve`
- [ ] All links working
- [ ] All images loading
- [ ] Search working properly
- [ ] Mobile responsive
- [ ] Analytics configured
- [ ] SEO metadata set
- [ ] Domain configured (if deploying)

---

## 📚 Resources

- **Quartz Documentation**: https://quartz.jzhao.xyz/
- **Quartz GitHub**: https://github.com/jackyzha0/quartz
- **Discord Community**: https://discord.gg/cRFFHYye7t

---

## 🎉 You're Ready!

Your Decision Risk Engine documentation is now configured for Quartz deployment.

**Next steps:**
1. Review the configuration
2. Test locally with `npx quartz build --serve`
3. Deploy to your preferred platform

**Quick deploy command:**

```bash
./docs/deploy-to-quartz.sh ~/my-docs-site
cd ~/my-docs-site
npx quartz build --serve
```

Good luck! 🚀

---

**Last Updated**: January 2026

