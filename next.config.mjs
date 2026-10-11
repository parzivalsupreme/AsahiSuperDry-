// Static export: `npm run build` writes a plain HTML/CSS/JS site to ./out
// Set NEXT_PUBLIC_BASE_PATH (e.g. "/my-repo") when hosting under a sub-path like GitHub Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
