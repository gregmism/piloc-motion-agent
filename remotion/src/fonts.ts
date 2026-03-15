import { loadFont } from "@remotion/google-fonts/Inter";

export const { waitUntilDone: waitForInter } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
