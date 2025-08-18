/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 参照されてもバンドルしない（ブラウザ／サーバー両方）
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: false,
    };

    // 念のためサーバー側は外部化してスキップ
    config.externals = [...(config.externals || []), 'canvas'];

    return config;
  },
};

module.exports = nextConfig;
