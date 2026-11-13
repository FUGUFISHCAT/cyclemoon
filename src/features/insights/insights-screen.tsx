import { AppText, Card, Notice, Row, Screen } from "@/components/ui";
import { DataStatus } from "@/components/data-status";
import { useDataStore } from "@/store/use-data-store";
import { predict } from "@/domain/prediction";
import { localToday, daysBetween } from "@/domain/dates";
export default function InsightsScreen() {
  const {
    snapshot: { data },
    ready,
  } = useDataStore();
  const p = ready ? predict(data, localToday()) : null,
    periods = [...data.periods].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <Screen title="洞察" subtitle="让真实记录帮助你认识变化。">
      <DataStatus />
      <Card tinted>
        <AppText kind="heading">{p ? "当前估计" : "等待更多记录"}</AppText>
        <Row label="经期记录" value={periods.length + " 条"} />
        <Row label="身体记录" value={data.entries.length + " 天"} />
        {p && (
          <>
            <Row label="估计周期" value={p.cycleDays + " 天"} />
            <Row
              label="下次月经经验范围"
              value={p.earliest + " 至 " + p.latest}
            />
            <Row
              label="估计排卵附近"
              value={p.ovulationFrom + " 至 " + p.ovulationTo}
            />
            <AppText kind="caption">
              {p.basis}。排卵附近仅按中心估计前 18–12
              天粗略展示，不表示实际发生排卵。
            </AppText>
            <Row label="排除的异常间隔" value={String(p.excluded)} />
          </>
        )}
      </Card>
      <Card>
        <AppText kind="heading">历史周期间隔</AppText>
        {periods.slice(1).map((current, i) => (
          <Row
            key={current.id}
            label={periods[i].start + " → " + current.start}
            value={daysBetween(periods[i].start, current.start) + " 天"}
          />
        ))}
        {periods.length < 2 && (
          <AppText>至少两次开始记录才能显示实际间隔。</AppText>
        )}
      </Card>
      <Notice>
        没有预测准确率声明。经验范围不是统计置信区间；有持续异常或不适时请咨询专业医疗人员。
      </Notice>
    </Screen>
  );
}
