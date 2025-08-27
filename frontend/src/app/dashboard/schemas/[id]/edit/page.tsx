'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiFetch from '@/utils/api';
import Link from 'next/link';

interface Field {
  name: string;
  xpath: string;
}

export default function EditSchemaTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [templateName, setTemplateName] = useState('');
  const [containerXpath, setContainerXpath] = useState('');
  const [fields, setFields] = useState<Field[]>([{ name: '', xpath: '' }]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templateId) {
        fetchTemplateData();
    }
  }, [templateId]);

  const fetchTemplateData = async () => {
    setIsLoading(true);
    try {
        const data = await apiFetch(`/api/schemas/${templateId}`);
        setTemplateName(data.name);
        setContainerXpath(data.container_xpath);
        setFields(data.fields.map((f: any) => ({ name: f.field_name, xpath: f.field_xpath })));
    } catch (err) {
        if(err instanceof Error) setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddField = () => setFields([...fields, { name: '', xpath: '' }]);
  const handleRemoveField = (index: number) => setFields(fields.filter((_, i) => i !== index));
  const handleFieldChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const newFields = [...fields];
    newFields[index][event.target.name as keyof Field] = event.target.value;
    setFields(newFields);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
        await apiFetch(`/api/schemas/${templateId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: templateName,
                container_xpath: containerXpath,
                fields: fields,
            }),
        });
        router.push('/dashboard/schemas');
    } catch(err) {
        if(err instanceof Error) setError(err.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) return <div>Đang tải template...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <Link href="/dashboard/schemas" className="text-sm text-indigo-600 hover:underline">&larr; Quay lại danh sách</Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Chỉnh sửa Template</h1>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md space-y-6">
        <div>
          <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">Tên Template</label>
          <input type="text" id="templateName" value={templateName} onChange={e => setTemplateName(e.target.value)} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
        </div>
        <div>
          <label htmlFor="containerXpath" className="block text-sm font-medium text-gray-700">XPath Vùng chứa</label>
          <input type="text" id="containerXpath" value={containerXpath} onChange={e => setContainerXpath(e.target.value)} required className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm" />
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-semibold">Các trường dữ liệu</h2>
        <div className="space-y-4 mt-4">
            {fields.map((field, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-md">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">Tên cột</label>
                        <input type="text" name="name" value={field.name} onChange={e => handleFieldChange(index, e)} required className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">XPath con</label>
                        <input type="text" name="xpath" value={field.xpath} onChange={e => handleFieldChange(index, e)} required className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm sm:text-sm" />
                    </div>
                    <button type="button" onClick={() => handleRemoveField(index)} className="self-end px-3 py-2 text-sm text-red-600 hover:text-red-800">Xóa</button>
                </div>
            ))}
        </div>
        <button type="button" onClick={handleAddField} className="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50">
            + Thêm trường
        </button>
      </div>
      
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
          <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
      </div>
    </form>
  );
}
