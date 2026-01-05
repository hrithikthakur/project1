# Documentation for Quartz Deployment

This folder contains the organized documentation for deploying to a Quartz static site.

## 📁 Structure

```
docs/
├── index.md              ← Main landing page (start here)
├── README.md             ← This file (deployment instructions)
├── quartz-config.md      ← Quartz configuration guide
└── navigation.md         ← Navigation structure for Quartz
```

## 🚀 Quick Deploy to Quartz

### Step 1: Install Quartz

```bash
# Clone Quartz
git clone https://github.com/jackyzha0/quartz.git
cd quartz
npm install
```

### Step 2: Copy Documentation Files

```bash
# From your project root
cp -r /Users/hrithikthakur/Code/project1/docs/* quartz/content/
cp /Users/hrithikthakur/Code/project1/*.md quartz/content/
cp /Users/hrithikthakur/Code/project1/backend/*.md quartz/content/backend/
cp /Users/hrithikthakur/Code/project1/backend/app/engine/*.md quartz/content/backend/engine/
```

### Step 3: Configure Quartz

Edit `quartz.config.ts` in your Quartz installation:

```typescript
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Decision Risk Engine Documentation",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    baseUrl: "your-site.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#faf8f8",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#4e4e4e",
          dark: "#2b2b2b",
          secondary: "#284b63",
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
}
```

### Step 4: Build and Deploy

```bash
cd quartz

# Build the site
npx quartz build

# Preview locally
npx quartz build --serve

# Deploy (various options)
npx quartz build --deploy
```

## 🌐 Deployment Options

### Option 1: GitHub Pages
```bash
npx quartz build --deploy github
```

### Option 2: Netlify
```bash
npx quartz build
# Upload the `public` folder to Netlify
```

### Option 3: Vercel
```bash
npx quartz build
# Deploy the `public` folder to Vercel
```

### Option 4: Custom Server
```bash
npx quartz build
# Copy the `public` folder to your web server
```

## 📝 File Organization for Quartz

The documentation is organized hierarchically:

```
content/
├── index.md                                    ← Landing page
│
├── Getting Started/
│   ├── QUICKSTART.md
│   ├── README.md
│   └── PYENV_SETUP.md
│
├── Forecast Engine/
│   ├── FORECAST_ENGINE_INDEX.md
│   ├── FORECAST_ENGINE_QUICKSTART.md
│   ├── FORECAST_ENGINE_SUMMARY.md
│   ├── FORECAST_ENGINE_ARCHITECTURE.md
│   ├── FORECAST_ENGINE_DELIVERY.md
│   └── FORECAST_ENGINE_README.md
│
├── Decision-Risk Engine/
│   ├── DECISION_RISK_ENGINE_INDEX.md
│   ├── QUICKSTART_DECISION_RISK_ENGINE.md
│   ├── DECISION_RISK_ENGINE_SUMMARY.md
│   ├── DECISION_RISK_ENGINE_ARCHITECTURE.md
│   ├── DECISION_RISK_ENGINE_USAGE.md
│   └── ...
│
├── Features/
│   ├── Dependencies/
│   ├── Risk Management/
│   ├── Scenarios/
│   └── Issues/
│
└── Technical Reference/
    └── ...
```

## 🎨 Customization

### Custom Navigation

Create a `_nav.md` file in your content directory:

```markdown
- [Home](/)
- [Getting Started](/QUICKSTART)
- [Forecast Engine](/FORECAST_ENGINE_INDEX)
- [Decision-Risk Engine](/backend/DECISION_RISK_ENGINE_INDEX)
```

### Custom Sidebar

Quartz will automatically generate a sidebar from your folder structure and internal links.

### Search

Quartz includes built-in search functionality. All your markdown files will be automatically indexed.

## 🔗 Internal Links

All links in the documentation use relative paths that work with Quartz:

- `[Link Text](../FILE.md)` → Works in Quartz
- `[Link Text](FILE.md)` → Works in Quartz
- `[Link Text](/path/to/FILE)` → Absolute path in Quartz

## ✅ Pre-Deployment Checklist

- [ ] All markdown files are in the content directory
- [ ] All internal links are working
- [ ] Images (if any) are in the correct location
- [ ] `quartz.config.ts` is configured
- [ ] Preview looks good (`npx quartz build --serve`)
- [ ] Navigation is intuitive
- [ ] Search is working
- [ ] All features are accessible

## 🔍 Testing Locally

Before deploying, test your site locally:

```bash
cd quartz
npx quartz build --serve
```

Then open http://localhost:8080 in your browser.

## 📚 Quartz Features to Leverage

1. **Graph View** - Automatically generated from internal links
2. **Backlinks** - Shows which pages link to the current page
3. **Table of Contents** - Auto-generated from headers
4. **Search** - Full-text search across all documents
5. **Tags** - Add tags to documents for categorization
6. **Dark Mode** - Built-in theme switching
7. **Mobile Responsive** - Works on all devices

## 🎯 Recommended Quartz Plugins

Add these to your `quartz.config.ts`:

```typescript
plugins: {
  transformers: [
    Plugin.FrontMatter(),
    Plugin.TableOfContents(),
    Plugin.CreatedModifiedDate(),
    Plugin.SyntaxHighlighting(),
    Plugin.ObsidianFlavoredMarkdown(),
    Plugin.GitHubFlavoredMarkdown(),
    Plugin.CrawlLinks(),
    Plugin.Latex(),
  ],
  filters: [Plugin.RemoveDrafts()],
  emitters: [
    Plugin.AliasRedirects(),
    Plugin.ComponentResources(),
    Plugin.ContentPage(),
    Plugin.FolderPage(),
    Plugin.TagPage(),
    Plugin.ContentIndex(),
    Plugin.Assets(),
    Plugin.Static(),
    Plugin.NotFoundPage(),
  ],
}
```

## 🚨 Common Issues

### Links Not Working
- Ensure relative paths are correct
- Use `.md` extensions in links
- Check for spaces in filenames

### Images Not Loading
- Place images in `content/assets/`
- Use relative paths: `![alt](./assets/image.png)`

### Build Errors
- Check for invalid markdown syntax
- Ensure all referenced files exist
- Look for circular references

## 📞 Support

- **Quartz Documentation**: https://quartz.jzhao.xyz/
- **Quartz GitHub**: https://github.com/jackyzha0/quartz
- **Discord**: https://discord.gg/cRFFHYye7t

## 🎉 Ready to Deploy!

Your documentation is now ready to be deployed to Quartz. Follow the steps above and your comprehensive documentation will be live!

---

**Quick Commands Summary**:

```bash
# 1. Setup
git clone https://github.com/jackyzha0/quartz.git
cd quartz && npm install

# 2. Copy files
cp -r /path/to/docs/* content/

# 3. Preview
npx quartz build --serve

# 4. Deploy
npx quartz build --deploy
```

Good luck! 🚀

