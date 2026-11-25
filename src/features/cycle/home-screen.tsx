import {useState} from "react";
import {AppText,Button,Card,Screen} from "@/components/ui";
import {DataStatus} from "@/components/data-status";
import {PeriodReview} from "@/components/period-review";
import {RecordPanel} from "@/features/records/record-screen";
import {useDataStore} from "@/store/use-data-store";
import {predict} from "@/domain/prediction";
import {localToday} from "@/domain/dates";
export default function HomeScreen(){const {snapshot:{data},ready}=useDataStore();const [open,setOpen]=useState(false);const today=localToday(),p=ready?predict(data,today):null;return <Screen title="今天" subtitle={today}>
<DataStatus/><PeriodReview/>
<Card tinted><AppText kind="caption">当前周期</AppText><AppText kind="hero">{p?'第 '+p.cycleDay+' 天':'从记录开始'}</AppText><AppText kind="heading">{p?'预计下次月经 '+p.next:'记录经期并设置周期参数'}</AppText>{p&&<AppText kind="caption">可能范围 {p.earliest} 至 {p.latest} · 仅供参考</AppText>}<Button title="记录" disabled={!ready} onPress={()=>setOpen(true)}/></Card>
<RecordPanel date={today} visible={open} onClose={()=>setOpen(false)}/>
</Screen>;}
