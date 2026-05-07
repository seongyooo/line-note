import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

const config: QuartzConfig = {
  configuration: {
    pageTitle: "Line Note",
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "ko-KR",
    baseUrl: "seongyooo.github.io/line-note",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Noto Sans KR",   // 한국어 헤더
        body: "Noto Sans KR",     // 한국어 본문
        code: "JetBrains Mono",   // 코드 블록
      },
      colors: {
        lightMode: {
          light: "#ffffff",        // 배경 (순백)
          lightgray: "#f0f0f0",   // 서브 배경
          gray: "#b8b8b8",        // 경계선
          darkgray: "#4a4a4a",    // 본문 텍스트
          dark: "#1a1a1a",        // 헤더 텍스트
          secondary: "#3d7ebf",   // 링크 / 포인트 색상 (차분한 블루)
          tertiary: "#6aabf7",    // hover 색상
          highlight: "rgba(61, 126, 191, 0.08)",  // 하이라이트 배경
          textHighlight: "#fff176aa",              // 텍스트 마커
        },
        darkMode: {
          light: "#1a1a1a",        // 배경 (딥 다크)
          lightgray: "#242424",   // 서브 배경
          gray: "#555555",        // 경계선
          darkgray: "#cccccc",    // 본문 텍스트
          dark: "#f0f0f0",        // 헤더 텍스트
          secondary: "#6aabf7",   // 링크 / 포인트 색상 (밝은 블루)
          tertiary: "#93c4f9",    // hover 색상
          highlight: "rgba(106, 171, 247, 0.1)",  // 하이라이트 배경
          textHighlight: "#b3aa0288",              // 텍스트 마커
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
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
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      Plugin.CustomOgImages(),
    ],
  },
}

export default config