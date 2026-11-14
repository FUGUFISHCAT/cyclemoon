import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AppText, Button, Card, Notice, Screen } from "@/components/ui";
import { buildMonth, dateKey, shiftMonth } from "@/domain/calendar";
import { useTheme } from "@/theme/tokens";
import { useDataStore } from "@/store/use-data-store";
import { predict } from "@/domain/prediction";
import { addDays, localToday } from "@/domain/dates";
import { DataStatus } from "@/components/data-status";
import { useSessionStore } from "@/store/use-session-store";

export default function CalendarScreen() {
  const { colors } = useTheme();
  const data = useDataStore((s) => s.snapshot.data);
  const forecast = predict(data, localToday());
  const isRecorded = (date: string) =>
    data.periods.some((p) =>
      p.end ? date >= p.start && date <= p.end : date === p.start,
    );
  const isExpected = (date: string) =>
    Boolean(
      forecast &&
        !forecast.overdue &&
        date >= forecast.next &&
        date <= addDays(forecast.next, forecast.periodDays - 1),
    );
  const [today] = useState(() => new Date());
  const [visible, setVisible] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selected, setSelected] = useState(() =>
    dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const { year, month } = visible;
  const selectedEntry = data.entries.find((e) => e.date === selected);
  const cells = buildMonth(year, month);
  return (
    <Screen compact title="日历" subtitle="每一天，都可以被好好记住。">
      <DataStatus />
      <Card compact>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="上个月"
            onPress={() => setVisible(shiftMonth(year, month, -1))}
            style={{ padding: 12, minHeight: 48, minWidth: 48 }}
          >
            <AppText>‹</AppText>
          </Pressable>
          <AppText kind="heading">
            {year} 年 {month + 1} 月
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="下个月"
            onPress={() => setVisible(shiftMonth(year, month, 1))}
            style={{ padding: 12, minHeight: 48, minWidth: 48 }}
          >
            <AppText>›</AppText>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row" }}>
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
            <View key={day} style={{ flex: 1, alignItems: "center" }}>
              <AppText kind="caption">{day}</AppText>
            </View>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row" }}>
            {cells.slice(row * 7, row * 7 + 7).map((day, column) => {
              const key = day === null ? "" : dateKey(year, month, day);
              const active = selected === key;
              return (
                <View key={column} style={{ flex: 1 }}>
                  {day !== null && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={key + (active ? "，已选中" : "")}
                      accessibilityState={{ selected: active }}
                      onPress={() => setSelected(key)}
                      style={{
                        minHeight: 48,
                        borderRadius: 12,
                        borderWidth: active ? 2 : 0,
                        borderColor: colors.primary,
                        backgroundColor: active ? colors.tint : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <AppText>{day}</AppText>
                      {(isRecorded(key) ||
                        isExpected(key) ||
                        data.entries.some((e) => e.date === key)) && (
                        <AppText kind="caption">
                          {isRecorded(key)
                            ? "实"
                            : isExpected(key)
                              ? "预计"
                              : "记"}
                        </AppText>
                      )}
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ))}
        <Button
          secondary
          title="回到今天"
          onPress={() => {
            setVisible({ year: today.getFullYear(), month: today.getMonth() });
            setSelected(
              dateKey(today.getFullYear(), today.getMonth(), today.getDate()),
            );
          }}
        />
      </Card>
      <Card>
        <AppText kind="heading">{selected}</AppText>
        <AppText>
          {isRecorded(selected)
            ? "已记录经期"
            : isExpected(selected)
              ? "预计经期（中心日期推算）"
              : "无经期标记"}
        </AppText>
        {selectedEntry && (
          <>
            <AppText>
              心情：{selectedEntry.mood || "未填写"} · 疼痛 {selectedEntry.pain}
              /3 · 疲劳 {selectedEntry.fatigue}/3
            </AppText>
            <AppText>{selectedEntry.note || "无备注"}</AppText>
          </>
        )}
        <Button
          title="记录或编辑这一天"
          onPress={() => {
            useSessionStore.getState().selectDate(selected);
            router.navigate("/record");
          }}
        />
      </Card>
      <Notice>
        “实”为真实经期记录，“预计”为中心日期推算，“记”为身体记录。进行中的经期只标记已确认的开始日。预测存在不确定性，不能作为可靠避孕依据。
      </Notice>
    </Screen>
  );
}
