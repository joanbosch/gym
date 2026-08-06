import { pixelBasedPreset, type TailwindConfig } from "react-email"

export default {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: "#23644f",
        ink: "#17211e",
        muted: "#64706c",
        canvas: "#f3f6f5",
        surface: "#ffffff",
      },
    },
  },
} satisfies TailwindConfig
