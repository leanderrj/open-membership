import pluginRss from "@11ty/eleventy-plugin-rss";

/**
 * Eleventy config.
 *
 * Build output tree:
 *   _site/
 *     index.html
 *     posts/<slug>/index.html        (rendered for public + preview items)
 *     public.xml                      (open-items-only feed; Worker reads this)
 *     .well-known/open-membership     (publisher-config view of discovery)
 *     om-config.yaml                  (non-secret publisher config, bundled)
 *
 * The Worker intercepts /feed/om/:token/, /api/*, and
 * /.well-known/open-membership dynamically. Everything else; including
 * the public HTML pages and public.xml; is served as a static asset by
 * Cloudflare Workers Sites from the _site/ bucket.
 */
export default function (eleventyConfig) {
  eleventyConfig.addPlugin(pluginRss);

  eleventyConfig.addPassthroughCopy({ "om.config.yaml": "om-config.yaml" });

  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      const ad = new Date(a.data.date).getTime();
      const bd = new Date(b.data.date).getTime();
      return bd - ad;
    }),
  );

  eleventyConfig.addCollection("openPosts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/posts/*.md")
      .filter((p) => (p.data.om_access ?? "open") === "open")
      .sort((a, b) => {
        const ad = new Date(a.data.date).getTime();
        const bd = new Date(b.data.date).getTime();
        return bd - ad;
      }),
  );

  eleventyConfig.addNunjucksFilter("rfc822Date", (value) => {
    const d = value instanceof Date ? value : new Date(value);
    return d.toUTCString();
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site",
    },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    pathPrefix: "/",
  };
}
