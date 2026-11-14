import { useColorScheme } from "react-native";
import { palettes } from "./palettes";
export { palettes } from "./palettes";
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 12, card: 24 };
export function useTheme() {
  const dark = useColorScheme() === "dark";
  return { colors: palettes[dark ? "dark" : "light"], dark };
}
