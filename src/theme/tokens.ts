import { useColorScheme } from "react-native";

export const palettes = {
  light: {
    background: "#F8F5F1",
    surface: "#FFFDFA",
    text: "#302B2D",
    muted: "#75666B",
    primary: "#925266",
    onPrimary: "#FFFFFF",
    tint: "#F0DFE4",
    border: "#DED3D4",
  },
  dark: {
    background: "#1D191C",
    surface: "#292327",
    text: "#F5ECEF",
    muted: "#C1AFB6",
    primary: "#E7A8BE",
    onPrimary: "#30202A",
    tint: "#49313C",
    border: "#58464E",
  },
};
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 12, card: 24 };
export function useTheme() {
  const dark = useColorScheme() === "dark";
  return { colors: palettes[dark ? "dark" : "light"], dark };
}
