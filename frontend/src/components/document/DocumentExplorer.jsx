import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Folder,
  FileText,
  Grid3X3,
  List,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import documentApi from "@/api/documentApi";

function formatBytesKb(sizeKb) {
  if (sizeKb == null) return "";
  if (Number.isNaN(Number(sizeKb))) return "";
  return `${sizeKb} KB`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DocumentExplorer({ projectId, showToast, canManage = false }) {
  const [parentId, setParentId] = useState(null);
  const [path, setPath] = useState([]); // stack [{id,file_name}]

  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  const dropActiveRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await documentApi.getDocuments(projectId, parentId);
      // Backend: {items: DocumentRow[]} ở data
      const data = res?.data?.data ?? {};
      setItems(Array.isArray(data) ? data : data.items ? data.items : data);
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không tải được tài liệu", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, parentId, showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const breadcrumb = useMemo(() => [{ id: null, file_name: "Tài liệu" }, ...path], [path]);

  const goToFolder = (folder) => {
    if (!folder) {
      setParentId(null);
      setPath([]);
      return;
    }
    setParentId(folder.id);
    setPath((prev) => {
      const idx = prev.findIndex((p) => p.id === folder.id);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev, folder];
    });
  };

  const openCreateFolder = () => {
    setFolderName("");
    setFolderOpen(true);
  };

  const submitCreateFolder = async () => {
    if (!folderName.trim() || folderBusy) return;
    setFolderBusy(true);
    try {
      await documentApi.createFolder(projectId, { name: folderName, parentId });
      setFolderOpen(false);
      await refresh();
      showToast?.("Đã tạo thư mục", "success");
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không tạo được thư mục", "error");
    } finally {
      setFolderBusy(false);
    }
  };

  const submitUpload = async () => {
    if (!uploadFile || uploadBusy) return;
    setUploadBusy(true);
    try {
      await documentApi.uploadFile(projectId, { file: uploadFile, parentId });
      setUploadOpen(false);
      setUploadFile(null);
      await refresh();
      showToast?.("Đã upload file", "success");
    } catch (err) {
      showToast?.(err.response?.data?.message || "Upload thất bại", "error");
    } finally {
      setUploadBusy(false);
    }
  };

  const submitLink = async () => {
    if (!linkName.trim() || !linkUrl.trim() || linkBusy) return;
    setLinkBusy(true);
    try {
      await documentApi.linkExternal(projectId, { name: linkName, url: linkUrl });
      setLinkOpen(false);
      setLinkName("");
      setLinkUrl("");
      await refresh();
      showToast?.("Đã link tài liệu", "success");
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không link được", "error");
    } finally {
      setLinkBusy(false);
    }
  };

  const deleteItem = async (docId) => {
    if (docId == null) return;
    // Simple confirm (không dùng modal để giữ code gọn).
    const ok = window.confirm("Bạn có chắc muốn xóa tài liệu này không?");
    if (!ok) return;
    try {
      await documentApi.remove(docId);
      await refresh();
      showToast?.("Đã xóa", "success");
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không xóa được", "error");
    }
  };

  const downloadItem = async (doc) => {
    if (!doc || doc.type !== "File") return;
    try {
      const res = await documentApi.download(doc.id);
      const blob = res?.data;

      // Thử parse JSON nếu backend trả link ngoài (JSON).
      if (blob && blob.type && blob.type.includes("application/json")) {
        const text = await blob.text();
        const parsed = JSON.parse(text);
        const url = parsed?.data?.file_path;
        if (url && typeof url === "string") {
          window.open(url, "_blank", "noopener,noreferrer");
          return;
        }
      }

      // File local
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast?.(err.response?.data?.message || "Không tải được tài liệu", "error");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    if (!canManage) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadOpen(true);
  };

  const onDragOver = (e) => {
    if (!canManage) return;
    e.preventDefault();
    if (!dropActiveRef.current) {
      dropActiveRef.current = true;
    }
  };

  const onDragLeave = () => {
    dropActiveRef.current = false;
  };

  const FolderItemIcon = ({ type }) => {
    if (type === "Folder") return <Folder className="h-5 w-5 text-blue-600" />;
    // File
    return <FileText className="h-5 w-5 text-slate-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {breadcrumb.map((b, idx) => (
            <button
              key={`${b.id ?? "root"}-${idx}`}
              type="button"
              onClick={() => goToFolder(b.id == null ? null : b)}
              className={cn(
                "text-sm font-medium",
                idx === breadcrumb.length - 1 ? "text-slate-900" : "text-blue-600 hover:text-blue-700",
              )}
            >
              {b.file_name}
              {idx < breadcrumb.length - 1 && <span className="mx-2 text-slate-400">/</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              className={cn("px-3 py-1.5 text-xs flex items-center gap-2", viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50")}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              className={cn("px-3 py-1.5 text-xs flex items-center gap-2", viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50")}
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>

          {canManage && (
            <>
              <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={openCreateFolder}>
                <Plus className="h-4 w-4" />
                Thư mục
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => {
                  setUploadFile(null);
                  setUploadOpen(true);
                }}
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setLinkOpen(true)}>
                <LinkIcon className="h-4 w-4" />
                Link
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border border-slate-200 bg-white",
          canManage && dropActiveRef.current ? "ring-2 ring-blue-200" : "",
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileIcon className="h-10 w-10 text-slate-200" />
            <p className="mt-3 text-sm">Chưa có tài liệu.</p>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((doc) => (
                  <div
                    key={doc.id}
                    className="group rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-2">
                        <FolderItemIcon type={doc.type} />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (doc.type === "Folder") goToFolder({ id: doc.id, file_name: doc.file_name });
                            }}
                            className={cn(
                              "truncate text-sm font-semibold text-slate-900",
                              doc.type === "Folder" ? "hover:underline" : "",
                            )}
                          >
                            {doc.file_name}
                          </button>
                          <p className="mt-1 text-xs text-slate-500">
                            {doc.type === "File" ? formatBytesKb(doc.size_kb) : ""}
                          </p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-white/60 hover:text-slate-700"
                            aria-label="Actions"
                          >
                            <span className="text-xs">⋮</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              void downloadItem(doc);
                            }}
                            disabled={doc.type !== "File"}
                          >
                            <Download className="h-4 w-4" />
                            Tải về
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              void deleteItem(doc.id);
                            }}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Xóa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="mt-2 text-[11px] text-slate-400">{formatDate(doc.created_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-[1fr_90px_130px_40px] gap-2 px-2 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100">
                  <div>Tên</div>
                  <div className="text-right">Loại</div>
                  <div className="text-right">Ngày</div>
                  <div />
                </div>
                <div className="divide-y divide-slate-100">
                  {items.map((doc) => (
                    <div key={doc.id} className="grid grid-cols-[1fr_90px_130px_40px] gap-2 px-2 py-3 items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderItemIcon type={doc.type} />
                          {doc.type === "Folder" ? (
                            <button
                              type="button"
                              onClick={() => goToFolder({ id: doc.id, file_name: doc.file_name })}
                              className="truncate text-sm font-semibold text-slate-900 hover:underline text-left"
                            >
                              {doc.file_name}
                            </button>
                          ) : (
                            <span className="truncate text-sm font-semibold text-slate-800">{doc.file_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">{doc.type}</div>
                      <div className="text-right text-xs text-slate-500">{formatDate(doc.created_at)}</div>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-white/60 hover:text-slate-700"
                              aria-label="Actions"
                            >
                              <span className="text-xs">⋮</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => {
                                void downloadItem(doc);
                              }}
                              disabled={doc.type !== "File"}
                            >
                              <Download className="h-4 w-4" />
                              Tải về
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                void deleteItem(doc.id);
                              }}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thư mục</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="folderName">Tên thư mục</Label>
              <Input id="folderName" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="VD: Thiết kế" />
            </div>
            <p className="text-xs text-slate-500">Thư mục sẽ nằm trong thư mục hiện tại.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)} disabled={folderBusy}>
              Hủy
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void submitCreateFolder()} disabled={folderBusy || !folderName.trim()}>
              {folderBusy ? "Đang tạo..." : "Tạo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload file</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div
              className="rounded-lg border border-dashed border-slate-200 p-3"
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <Label className="text-sm text-slate-700 cursor-pointer">
                Chọn file hoặc kéo thả vào đây
                <Input
                  type="file"
                  className="mt-2 hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </Label>
              {uploadFile && <p className="mt-2 text-xs text-slate-500">Đã chọn: {uploadFile.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadBusy}>
              Hủy
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void submitUpload()} disabled={uploadBusy || !uploadFile}>
              {uploadBusy ? "Đang upload..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link tài liệu ngoài</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="linkName">Tên</Label>
              <Input id="linkName" value={linkName} onChange={(e) => setLinkName(e.target.value)} placeholder="VD: Google Drive - Slides" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="linkUrl">URL</Label>
              <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)} disabled={linkBusy}>
              Hủy
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void submitLink()} disabled={linkBusy || !linkName.trim() || !linkUrl.trim()}>
              {linkBusy ? "Đang link..." : "Tạo link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

