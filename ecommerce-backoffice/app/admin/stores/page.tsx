"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dgpk9aqnc";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

interface StoreRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  hours: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function AdminStoresPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    hours: "",
    imageUrl: "",
    sortOrder: 0,
    isActive: true,
  });

  const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/retail-stores`;

  const getAuthToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const uploadToCloudinary = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      fd.append("folder", "stores");
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText).secure_url);
        } else reject(new Error(xhr.statusText));
      });
      xhr.addEventListener("error", () => reject(new Error("Upload failed")));
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);
      xhr.send(fd);
    });
  };

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const r = await fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRows((await r.json()) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Дэлгүүрүүд | Admin";
    fetchRows();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      hours: "",
      imageUrl: "",
      sortOrder: 0,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: StoreRow) => {
    setEditing(s);
    setForm({
      name: s.name,
      address: s.address || "",
      phone: s.phone || "",
      hours: s.hours || "",
      imageUrl: s.imageUrl || "",
      sortOrder: s.sortOrder ?? 0,
      isActive: s.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Нэр оруулна уу");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const token = getAuthToken();
      const body = {
        name: form.name.trim(),
        address: form.address || null,
        phone: form.phone || null,
        hours: form.hours || null,
        imageUrl: form.imageUrl || null,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      const url = editing ? `${API_URL}/${editing.id}` : API_URL;
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSuccess(editing ? "Шинэчиллээ" : "Нэмэгдлээ");
      setDialogOpen(false);
      fetchRows();
      setTimeout(() => setSuccess(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Устгах уу?")) return;
    try {
      const token = getAuthToken();
      const r = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fetchRows();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Дэлгүүрүүд</h1>
            <p className="text-sm text-muted-foreground">Борлуулалтын цэг, салбарууд</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Дэлгүүр нэмэх
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Жагсаалт</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Нэр</TableHead>
                <TableHead>Утас</TableHead>
                <TableHead>Хаяг</TableHead>
                <TableHead>Эрэмбэ</TableHead>
                <TableHead>Төлөв</TableHead>
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {s.address || "—"}
                  </TableCell>
                  <TableCell>{s.sortOrder}</TableCell>
                  <TableCell>{s.isActive ? "Идэвхтэй" : "Идэвхгүй"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Дэлгүүр байхгүй байна.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Дэлгүүр засах" : "Шинэ дэлгүүр"}</DialogTitle>
            <DialogDescription>Хаяг, цагийн хуваарь зэргийг оруулна уу.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Нэр *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>Утас</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>Хаяг</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>Ажиллах цаг</Label>
              <Input
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="Ж ням 10:00–20:00"
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>Зураг URL</Label>
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  disabled={saving || uploading}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="store-img-upload"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setUploading(true);
                      const url = await uploadToCloudinary(f);
                      setForm((prev) => ({ ...prev, imageUrl: url }));
                    } catch {
                      setError("Зураг оруулахад алдаа");
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => document.getElementById("store-img-upload")?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Оруулах"}
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Эрэмбэ</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value, 10) || 0 })}
                disabled={saving}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="store-active"
                checked={form.isActive}
                onCheckedChange={(c) => setForm({ ...form, isActive: c === true })}
                disabled={saving}
              />
              <Label htmlFor="store-active">Идэвхтэй</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Болих
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Хадгалах"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
