/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow external images (e.g. Cloudinary banners)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  // Ensure CSS is properly processed
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Ensure CSS files are included in the build
  productionBrowserSourceMaps: false,
  // Compress output
  compress: true,
}

module.exports = nextConfig
