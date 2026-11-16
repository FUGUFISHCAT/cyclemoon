import { shareOrDownload } from "./share-file";
export async function downloadText(
  name: string,
  content: string,
  type: string,
){
  const file=new File([content],name,{type});
  return shareOrDownload(file,navigator,()=>downloadFile(name,content,type));
}
function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari may still be handing the download to Files / Share Sheet.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function pickBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    document.body.appendChild(input);
    const cleanup = () => input.remove();
    input.oncancel = () => {
      cleanup();
      resolve(null);
    };
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        if (file.size > 2 * 1024 * 1024) throw new Error("备份超过 2 MB 上限");
        resolve(await file.text());
      } catch (e) {
        reject(e);
      } finally {
        cleanup();
      }
    };
    input.click();
  });
}
