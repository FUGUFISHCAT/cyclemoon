// Native file adapter is reserved; never pretend a download succeeded.
export function downloadText(
  _name: string,
  _content: string,
  _type: string,
): void {
  throw new Error("原生文件适配尚未接入；请使用 PWA 导出。");
}
export async function pickBackup(): Promise<string | null> {
  throw new Error("原生文件导入尚未接入；未来复用相同备份校验器。");
}
