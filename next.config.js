const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const withWebWorkers = (nextConfig) => {
  return {
    ...nextConfig,
    webpack(config, options) {
      config.module.rules.unshift({
        test: /\.worker\.ts$/i,
        use: {
          loader: "worker-loader",
          options: {
            filename: "static/static/[name].[fullhash].js",
            publicPath: "/_next/",
            esModule: false,
          },
        },
      });

      //config.output.globalObject = 'typeof self !== "object" ? self : this';

      if (typeof nextConfig.webpack === "function") {
        return nextConfig.webpack(config, options);
      }
      return config;
    },
  };
};

module.exports = (phase, { defaultConfig }) => {
  return withWebWorkers(
    withBundleAnalyzer({
      ...defaultConfig,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_KEY,
      },
    })
  );
};
