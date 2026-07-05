import { withBetterStack } from "@logtail/next";
import i18nConfig from "./next-i18next.config.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  i18n: i18nConfig.i18n,
};

export default withBetterStack(nextConfig);
