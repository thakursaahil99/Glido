"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { api, ApiError, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import type { Banner } from "@/lib/types";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { ImageUploadField } from "@/components/image-upload-field";
import { Modal } from "@/components/modal";
import { RequirePermission } from "@/components/require-permission";

export default function AdminBannersPage() {
  return (
    <RequirePermission permission="manage_banners">
      <BannersContent />
    </RequirePermission>
  );
}

function BannersContent() {
  const { show } = useToast();
  const [banners, setBanners] = useState<Banner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", imageUrl: "", link: "" });
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    try {
      setBanners(await api.get<Banner[]>("/admin/banners"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load banners.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(b: Banner) {
    try {
      await api.patch(`/admin/banners/${b.id}`, { isActive: !b.isActive });
      show(b.isActive ? "Banner hidden" : "Banner shown", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not update banner.", "error");
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/banners/${id}`);
      show("Banner deleted", "success");
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not delete banner.", "error");
    }
  }

  async function createBanner(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post("/admin/banners", form);
      show("Banner created", "success");
      setShowCreate(false);
      setForm({ title: "", imageUrl: "", link: "" });
      load();
    } catch (e) {
      show(e instanceof ApiError ? e.message : "Could not create banner.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Homepage banners (CMS)</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New banner
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && banners === null && <div className="h-40 skeleton" />}
      {!error && banners && banners.length === 0 && <EmptyState icon={ImageIcon} title="No banners yet" />}

      {!error && banners && banners.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="card-glido overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveMediaUrl(b.imageUrl)} alt={b.title} className="h-32 w-full object-cover" />
              <div className="p-3">
                <p className="font-medium text-sm">{b.title}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`badge ${b.isActive ? "badge-veg" : "badge-muted"}`}>{b.isActive ? "Live" : "Hidden"}</span>
                  <div className="space-x-2 text-sm">
                    <button onClick={() => toggleActive(b)} className="text-[var(--glido-primary)] font-medium">
                      {b.isActive ? "Hide" : "Show"}
                    </button>
                    <button onClick={() => remove(b.id)} className="text-[var(--glido-danger)] font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} title="Add banner" onClose={() => setShowCreate(false)}>
        <form onSubmit={createBanner} className="space-y-2">
          <input className="input-glido" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <ImageUploadField value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
          <input className="input-glido" placeholder="Link (e.g. /food)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <button className="btn-primary w-full" disabled={creating}>{creating ? "Adding..." : "Add banner"}</button>
        </form>
      </Modal>
    </div>
  );
}
