/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [{ source: '/', has: [{ type: 'query', key: 'view', value: 'equipment' }], destination: '/equipment', permanent: false }];
  },
};

export default nextConfig;
