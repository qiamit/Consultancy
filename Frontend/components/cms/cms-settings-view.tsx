"use client";

import { useState } from "react";
import { updateCmsSettings } from "@backend/actions/cms";
import type { CmsSettingsRow } from "@backend/shared/types/cms";

export function CmsSettingsView({ initialSettings }: { initialSettings: CmsSettingsRow | null }) {
  const [formData, setFormData] = useState({
    contact_email: initialSettings?.contact_email || "",
    contact_phone: initialSettings?.contact_phone || "",
    address: initialSettings?.address || "",
    about_text: initialSettings?.about_text || "",
    facebook_url: initialSettings?.facebook_url || "",
    linkedin_url: initialSettings?.linkedin_url || "",
    instagram_url: initialSettings?.instagram_url || "",
    twitter_url: initialSettings?.twitter_url || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg({ text: "", type: "" });

    const res = await updateCmsSettings(formData);

    if (res?.error) {
      setMsg({ text: res.error, type: "error" });
    } else {
      setMsg({ text: "Settings saved successfully.", type: "success" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-6">Site Settings</h2>
      
      {msg.text && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${msg.type === "error" ? "bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Contact Information</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input type="text" value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Physical Address</label>
              <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm h-24" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Social Links</h3>
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input type="url" value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Facebook URL</label>
              <input type="url" value={formData.facebook_url} onChange={e => setFormData({...formData, facebook_url: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instagram URL</label>
              <input type="url" value={formData.instagram_url} onChange={e => setFormData({...formData, instagram_url: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Twitter/X URL</label>
              <input type="url" value={formData.twitter_url} onChange={e => setFormData({...formData, twitter_url: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Company Details</h3>
          <div>
            <label className="block text-sm font-medium mb-1">About Us Text</label>
            <p className="text-xs text-zinc-500 mb-2">This will be displayed on the public landing page in the About Us section.</p>
            <textarea value={formData.about_text} onChange={e => setFormData({...formData, about_text: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm h-48" />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-zinc-800">
          <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 transition">
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
