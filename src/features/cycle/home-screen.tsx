import { router } from 'expo-router';
import { AppText, Button, Card, Notice, Row, Screen } from '@/components/ui';
import { DataStatus } from '@/components/data-status';
import { useDataStore } from '@/store/use-data-store';
import { predict } from '@/domain/prediction';
import { localToday, daysBetween } from '@/domain/dates';
import { planReminders } from '@/domain/reminders';
export default function HomeScreen(){
  const {snapshot:{data},ready}=useDataStore();
  const today=localToday(),p=ready?predict(data,today):null,r=ready?planReminders(data,today)[0]:null;
  return <Screen title="照顾自己的节奏" subtitle={today+' · 月相 Cycle'}>
    <DataStatus/>
    <Card tinted><AppText kind="caption">我的周期</AppText><AppText kind="hero">{p?'第 '+p.cycleDay+' 天':'从记录开始'}</AppText>
      <AppText>{p?.phase??'添加经期记录与周期参数后，查看初步估计。'}</AppText>
      {p && <><Row label="预计下次月经" value={p.next}/><Row label={p.overdue?'已超过中心估计':'距离中心估计'} value={Math.abs(daysBetween(today,p.next))+' 天'}/><Row label="经验日期范围" value={p.earliest+' 至 '+p.latest}/><AppText kind="caption">{p.basis}</AppText></>}
      <Button title="记录经期与身体状态" onPress={()=>router.navigate('/record')}/>
      {!data.profile && <Button secondary title="设置我的周期参数" onPress={()=>router.navigate('/settings')}/>}
    </Card>
    <Card><AppText kind="heading">下一条日历提醒</AppText><AppText>{r?r.date+' · '+r.title:'暂无可生成的未来提醒'}</AppText><AppText kind="caption">这是待导出的日程，不是 iOS 本地通知。请在设置导出 ICS 并导入日历。</AppText><Button secondary title="设置提醒与导出日历" onPress={()=>router.navigate('/settings')}/></Card>
    <Notice>预测是日历估计，不是医学判断，不能作为可靠避孕依据。不规律或历史不足时尤其不确定；逾期不会自动虚构新周期。</Notice>
  </Screen>;
}
