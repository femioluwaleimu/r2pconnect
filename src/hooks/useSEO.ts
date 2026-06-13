import { useEffect } from "react";

interface SEOOptions {
  title: string;
  description: string;
  url?: string;
  type?: string;
  image?: string;
  keywords?: string;
}

const DEFAULT_TITLE = "R2P Connect - Research2Practice Platform";
const DEFAULT_IMAGE = "https://storage.googleapis.com/gpt-engineer-file-uploads/dHqcxmeon1ZeIyPVzAZoVqPh7Bv1/social-images/social-1766951643071-Screenshot 2025-12-28 205246.png";

function setMeta(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function useSEO({ title, description, url, type = "website", image, keywords }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title.includes("R2PConnect") ? title : `${title} | R2PConnect`;
    const fullUrl = url ? `${window.location.origin}${url}` : window.location.href;
    const ogImage = image || DEFAULT_IMAGE;

    document.title = fullTitle;

    setMeta("name", "description", description);
    if (keywords) setMeta("name", "keywords", keywords);

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", fullUrl);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", ogImage);

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
    setMeta("name", "twitter:card", "summary_large_image");

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title, description, url, type, image, keywords]);
}
