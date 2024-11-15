/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Avoid bundling react-reconciler on the server
      config.resolve.alias = {
        ...config.resolve.alias,
        'react-reconciler': false,
        'react-reconciler/constants': false
      };
    }
    // Mark react-reconciler as external
    config.externals = [...(config.externals || []), 'react-reconciler'];
    
    return config;
  },
};

export default nextConfig; 