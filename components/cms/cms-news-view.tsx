"use client";

import { useState } from "react";
import { addCmsNews, updateCmsNews, deleteCmsNews } from "@/lib/actions/cms";

export function CmsNewsView({ initialNews }: { initialNews: any[] }) {
  const [newsList, setNewsList] = useState(initialNews);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", image_url: "", published_date: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleEdit = (news: any) => {
    setIsEditing(news.id);
    setFormData({
      title: news.title,
      content: news.content,
      image_url: news.image_url || "",
      published_date: news.published_date ? new Date(news.published_date).toISOString().slice(0, 16) : "",
    });
    setErrorMsg("");
  };

  const handleAddNew = () => {
    setIsEditing("new");
    setFormData({ title: "", content: "", image_url: "", published_date: new Date().toISOString().slice(0, 16) });
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

    const payload = {
      ...formData,
      published_date: formData.published_date ? new Date(formData.published_date).toISOString() : undefined,
    };

    let res;
    if (isEditing === "new") {
      res = await addCmsNews(payload);
    } else if (isEditing) {
      res = await updateCmsNews(isEditing, payload);
    }

    if (res?.error) {
      setErrorMsg(res.error);
    } else {
      setIsEditing(null);
      window.location.reload(); 
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this news update?")) return;
    const res = await deleteCmsNews(id);
    if (res?.error) alert(res.error);
    else window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Manage News & Updates</h2>
        <button onClick={handleAddNew} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
          Add News Update
        </button>
      </div>

      {isEditing && (
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-base font-semibold mb-4">{isEditing === "new" ? "Add News" : "Edit News"}</h3>
          {errorMsg && <p className="text-red-500 text-sm mb-4">{errorMsg}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content</label>
              <textarea required value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm h-32" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image URL (Optional)</label>
              <input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Publish Date</label>
              <input type="datetime-local" value={formData.published_date} onChange={e => setFormData({...formData, published_date: e.target.value})} className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save News"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {newsList.length === 0 && !isEditing && (
          <p className="text-zinc-500 text-sm">No news updates yet. Click "Add News Update" to get started.</p>
        )}
        {newsList.map((news) => (
          <div key={news.id} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{news.title}</h3>
              <div className="flex gap-2 shrink-0 ml-4">
                <button onClick={() => handleEdit(news)} className="text-sky-600 hover:text-sky-700 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(news.id)} className="text-red-600 hover:text-red-700 text-sm font-medium">Delete</button>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mb-3">Published: {new Date(news.published_date).toLocaleString()}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3 mb-3 flex-1 whitespace-pre-wrap">{news.content}</p>
            {news.image_url && <img src={news.image_url} alt={news.title} className="w-full h-32 object-cover rounded-lg mt-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}
