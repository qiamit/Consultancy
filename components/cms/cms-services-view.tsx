"use client";

import { useState } from "react";
import { addCmsService, updateCmsService, deleteCmsService } from "@/lib/actions/cms";

export function CmsServicesView({ initialServices }: { initialServices: any[] }) {
  const [services, setServices] = useState(initialServices);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", icon_name: "", is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleEdit = (service: any) => {
    setIsEditing(service.id);
    setFormData({
      title: service.title,
      description: service.description,
      icon_name: service.icon_name || "",
      is_active: service.is_active,
    });
    setErrorMsg("");
  };

  const handleAddNew = () => {
    setIsEditing("new");
    setFormData({ title: "", description: "", icon_name: "", is_active: true });
    setErrorMsg("");
  };

  const handleCancel = () => {
    setIsEditing(null);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    let res;
    if (isEditing === "new") {
      res = await addCmsService(formData);
    } else if (isEditing) {
      res = await updateCmsService(isEditing, formData);
    }

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setIsEditing(null);
      // Let Server Actions revalidate, but we might need router.refresh() if it doesn't automatically update here.
      window.location.reload(); 
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    const res = await deleteCmsService(id);
    if (res?.error) alert(res.error);
    else window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Manage Services</h2>
        <button onClick={handleAddNew} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          Add New Service
        </button>
      </div>

      {isEditing && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold mb-4">{isEditing === "new" ? "Add Service" : "Edit Service"}</h3>
          {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm h-24" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon Name (Optional - e.g., 'Shield', 'Globe')</label>
              <input value={formData.icon_name} onChange={e => setFormData({...formData, icon_name: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-sky-600 focus:ring-sky-500" />
              <label htmlFor="is_active" className="text-sm font-medium">Is Active (Visible to public)</label>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save Service"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 && !isEditing && (
          <p className="text-zinc-500 text-sm">No services added yet. Click "Add New Service" to get started.</p>
        )}
        {services.map((svc) => (
          <div key={svc.id} className={`p-5 rounded-xl border ${svc.is_active ? 'border-zinc-200 dark:border-zinc-800' : 'border-zinc-200 bg-zinc-50 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/50'}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{svc.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(svc)} className="text-sky-600 hover:text-sky-700 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(svc.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">Delete</button>
              </div>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3">{svc.description}</p>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{svc.icon_name ? `Icon: ${svc.icon_name}` : 'No icon'}</span>
              <span className={svc.is_active ? 'text-emerald-600 font-medium' : 'text-zinc-500'}>{svc.is_active ? 'Active' : 'Draft'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
