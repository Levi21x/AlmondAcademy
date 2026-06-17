/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // SharedArrayBuffer is required by onnxruntime-web (threaded WASM used by Silero VAD).
  // COOP + COEP headers enable cross-origin isolation, which unlocks SharedArrayBuffer in all modern browsers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // onnxruntime-web (pulled in by @ricky0123/vad-web for Silero VAD) references
    // Node built-ins that don't exist in the browser. Stub them on the client.
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
      path: false,
      crypto: false,
    };

    // Allow WebAssembly modules (onnxruntime-web ships .wasm/.mjs)
    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
    };

    // Don't bundle onnxruntime-web on the server — it's a client-only dynamic import.
    if (isServer) {
      config.externals = [...(config.externals || []), "onnxruntime-web"];
    }

    return config;
  },
};

module.exports = nextConfig;
