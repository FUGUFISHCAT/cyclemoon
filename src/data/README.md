# 数据实现

CycleRepository 定义 load / commit。Web 使用 indexeddb.ts，事务校验 revision 后写入；未来 / 未知版本失败不清空。数据结构、容量及迁移见 docs/DATA_MODEL.md。
repository.native.ts 为 SQLite 预留，明确抛错。不得把 Zustand 内存状态当原生持久化成功。
