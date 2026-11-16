# 数据、Repository 与备份协议（0.2.0）

## 实际持久化

Web IndexedDB：数据库 cyclemoon-local，数据库版本 2，对象仓库 state，主键 root。
Snapshot = {schemaVersion:2, revision:非负整数, data:CycleData}。所有用户数据单事务提交，规范化数据最大 1 MB，容量不足或失败不修改原记录。revision 在事务内比较递增，冲突拒绝，不能用旧快照覆盖新记录。

CycleData：

- profile：null 或 {cycleDays:15–90 整数, periodDays:1–20 整数且小于周期, irregular:boolean}。初始 null，不预置真实用户参数。
- periods：{id,start,end|null}[]；本地 YYYY-MM-DD，结束不早于开始，最大跨度 60 天；ID 唯一，区间不重叠，进行中记录不能覆盖后续记录。
- entries：{date,flow,spotting,pain,fatigue,mood,note}[]；日期唯一，flow 为 none/light/medium/heavy，症状 0–3，情绪最多 30 字，备注最多 2000 字。
- reminders：hour 0–23、minute 0–59、privacy、四类开关。默认 09:00、隐私文案打开；这只是配置，不代表通知已安排。

保存入口通过 validateData，输出白名单字段与日期排序，不保留任意未知对象属性。不在导航 URL 或日志保存健康记录。日历日期支持 1900–2199，日历运算显式采用 UTC 日编号，显示“今天”取设备本地日期。

## 迁移与故障

IDB onupgradeneeded 仅在不存在时创建 state，从不 deleteObjectStore / deleteDatabase。v1 snapshot 与当前记录字段相同、允许缺少 reminders；decodeSnapshot 返回补充默认提醒的 v2 视图，下一次成功提交写入 v2，旧记录保留。
未知数据版本 / 更高数据库版本拒绝读写，升级被其他窗口阻止时提示关闭其他窗口；不静默重建。onversionchange 关闭连接以允许升级。
测试使用 fake-indexeddb 验证迁移、拒绝未来版本、事务失败保留与冲突；不能替代 Safari 存储引擎实测。

## JSON 备份

{app:"CycleMoonBackup",schemaVersion:2,exportedAt:UTC ISO,data:CycleData}，UTF-8 JSON，最大 2 MB。导出无 revision、无设备通知 identifier。导入先验证格式、版本、字段、日期、重复 / 冲突、容量；预览后明确确认整份覆盖，再使用相同 Repository.commit 原子提交。
导入 v1 复用迁移器。校验失败不执行写入，冲突 / 空间不足事务失败保留旧数据。备注包含中文、换行、emoji 的往返有自动化测试。
文件未加密，UI 提示敏感数据；浏览器下载与系统文件同步受用户文件保存方式影响。

## 原生与未来加密

CycleRepository 接口 load / commit 为平台边界；repository.native.ts 是明确抛错的 SQLite 预留，不能保存。未来 SQLite 用数据表或版本化快照实现同一协议，并在事务内迁移 / 校验，不直接读取 Safari 沙箱。
加密尚未实现；不以开关代替密钥管理。未来 SQLCipher / 系统安全存储需要原生构建与迁移验证。PWA 到原生通过用户导出的同一 JSON，离线导入，见 ARCHITECTURE。

## V0.3 备份协议补充
内部 IndexedDB / Snapshot 保持版本 2。导出备份升级为 schemaVersion 3，含 appVersion、exportedAt、encrypted:false、cycleRecords、dailyLogs、preferences；兼容读取 v1/v2 备份。未加密，未来版本拒绝，不静默清空。详见 SECURITY.md。

## V0.3.1（覆盖上述历史 v2 说明）
数据库版本与 Snapshot schemaVersion 为3，原 state/root 保留并从已知v1/v2解码升级。经期增加可选 endPending:true，必须与 end:null 配对；待确认不代表持续出血，可以在用户明确确认后与下一条经期共存。旧版数据库连接拒绝降级。JSON备份schema仍为3，appVersion=0.3.1。未知/未来版本继续拒绝且不清空。
