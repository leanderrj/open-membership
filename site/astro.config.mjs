import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://openmembership.org',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  experimental: {
    contentLayer: true,
  },
  integrations: [tailwind({ applyBaseStyles: true })],
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: { className: ['anchor'], ariaHidden: 'true', tabIndex: -1 },
          content: {
            type: 'element',
            tagName: 'span',
            properties: { className: ['anchor-mark'], ariaHidden: 'true' },
            children: [{ type: 'text', value: '¶' }],
          },
        },
      ],
    ],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
