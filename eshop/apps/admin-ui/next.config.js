//@ts-check
const path = require('path');
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/eugenesokojamo/**',
      },
    ],
  },
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias['@packages'] = path.resolve(__dirname, '../../packages');
    return config;
  },
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);