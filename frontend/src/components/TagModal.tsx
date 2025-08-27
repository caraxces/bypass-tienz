'use client';
import { useState } from 'react';
import apiFetch from '@/utils/api';

interface Tag {
    id: string;
    name: string;
    content: string;
    is_active: boolean;
}
interface TagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    projectId: string;
    tag: Tag | null;
}

export default function TagModal({ isOpen, onClose, onSave, projectId, tag }: TagModalProps) {
    const [name, setName] = useState(tag?.name || '');
    const [content, setContent] = useState(tag?.content || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (tag) { // Update
                await apiFetch(`/api/tags/${tag.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name, content }),
                });
            } else { // Create
                await apiFetch('/api/tags', {
                    method: 'POST',
                    body: JSON.stringify({ project_id: projectId, name, content }),
                });
            }
            onSave();
            onClose();
        } catch (err) {
            if (err instanceof Error) alert(`Lỗi: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-10 bg-gray-500 bg-opacity-75">
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
                    <form onSubmit={handleSubmit}>
                        <h3 className="text-lg font-medium text-gray-900">{tag ? 'Chỉnh sửa Tag' : 'Tạo Tag Mới'}</h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tên Tag</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="VD: Google Analytics 4" className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nội dung Script</label>
                                <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} required placeholder="<!-- Dán mã script của bạn vào đây -->" className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm"/>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Hủy</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50">{isSaving ? 'Đang lưu...' : 'Lưu'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
