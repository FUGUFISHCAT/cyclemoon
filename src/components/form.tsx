import { TextInput, View, Switch, Platform } from "react-native";
import { localToday } from "@/domain/dates";
import { AppText, Button } from "./ui";
import { useTheme } from "@/theme/tokens";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  numeric = false,
  dateInput = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  numeric?: boolean;
  dateInput?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText kind="caption">{label}</AppText>
      {dateInput && Platform.OS === "web" ? <input type="date" aria-label={label} value={value} min="1900-01-01" max={localToday()} onInput={e => onChange(e.currentTarget.value)} onChange={e => onChange(e.target.value)} style={{width:"100%",minWidth:0,boxSizing:"border-box",border:`1px solid ${colors.border}`,borderRadius:12,padding:14,minHeight:48,color:colors.text,backgroundColor:colors.background,fontSize:16}} /> : <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={numeric ? "number-pad" : "default"}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={multiline ? 2000 : 100}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          minHeight: 48,
          color: colors.text,
          backgroundColor: colors.background,
          fontSize: 16,
        }}
      />}
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View style={{ flex: 1 }}>
        <AppText>{label}</AppText>
      </View>
      <Switch
        style={{minWidth: 44, minHeight: 44}}
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}
export function Choices({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <AppText kind="caption">
        {label} · 已选 {options.find((o) => o.value === value)?.label}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <Button
            key={o.value}
            secondary={value !== o.value}
            title={o.label}
            onPress={() => onChange(o.value)}
          />
        ))}
      </View>
    </View>
  );
}
