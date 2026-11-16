export type ExportResult = "shared" | "downloaded" | "cancelled";
export async function shareOrDownload(file: File, platform: {canShare?: (data: ShareData)=>boolean; share?: (data: ShareData)=>Promise<void>}, download: ()=>void): Promise<ExportResult> {
 const payload={files:[file]};
 try {
  if(platform.share && platform.canShare?.(payload)) {
   await platform.share(payload);return "shared";
  }
 }catch(error){if(error instanceof Error && error.name==="AbortError")return "cancelled";}
 download();return "downloaded";
}
export function exportMessage(result: ExportResult): string {
 return result==="cancelled"?"已取消分享，未确认保存任何文件。":result==="shared"?"系统分享已完成，请在“文件”App 确认文件实际保存；备份未加密。":"已交给浏览器下载，请确认保存到“文件”App；备份未加密。";
}
