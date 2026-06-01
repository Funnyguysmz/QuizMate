import React, { useEffect, useState } from 'react';
import { Button } from '../components/shared/Button';
import type { AppSettings, CandidateProfile } from '../../shared/types';

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await window.electronAPI.getSettings();
    setSettings(s);
    const key = await window.electronAPI.getApiKey();
    if (key) setApiKey(key);
    const p = await window.electronAPI.getCandidateProfile();
    setProfile(p);
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      await window.electronAPI.updateSettings(settings);
      if (apiKey) {
        await window.electronAPI.setApiKey(apiKey);
      } else {
        await window.electronAPI.deleteApiKey();
      }
      if (profile) {
        await window.electronAPI.updateCandidateProfile({
          job_context: profile.job_context,
        });
      }
      setMessage('保存成功');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage('保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handlePickFolder() {
    const folder = await window.electronAPI.openFolderDialog(settings?.study_materials_path);
    if (folder && settings) {
      try {
        const updated = await window.electronAPI.updateSettings({
          study_materials_path: folder,
        });
        setSettings(updated);
        setMessage('资料路径已保存');
        setTimeout(() => setMessage(''), 3000);
      } catch (e) {
        setMessage('保存失败');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  }

  async function handleImportResume() {
    try {
      const result = await window.electronAPI.importResumePdf();
      if (!result) return;
      const updated = await window.electronAPI.updateCandidateProfile({
        resume_file_path: result.filePath,
        resume_text: result.text,
      });
      setProfile(updated);
      setProfileMessage('简历已导入并保存');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (e) {
      setProfileMessage('简历导入失败：' + (e instanceof Error ? e.message : String(e)));
      setTimeout(() => setProfileMessage(''), 5000);
    }
  }

  async function handleClearProfile() {
    await window.electronAPI.clearCandidateProfile();
    setProfile(null);
    setProfileMessage('画像已清空');
    setTimeout(() => setProfileMessage(''), 3000);
  }

  if (!settings) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          配置应用和数据源
        </p>
      </div>

      <div className="space-y-6">
        {/* Study Materials Path */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            学习资料路径
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.study_materials_path}
              onChange={(e) => setSettings({ ...settings, study_materials_path: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Button variant="secondary" onClick={handlePickFolder}>
              选择文件夹
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-400">选择存放面试学习资料的文件夹</p>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            DeepSeek API Key
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M15 12a3 3 0 01-3 3m0 0a3 3 0 01-3-3m3 3v4m-2-2h4" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-400">用于 AI 生成测验试题，密钥仅存储在本地</p>
        </div>

        {/* Default Question Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            默认试题数量
          </label>
          <input
            type="range"
            min="3"
            max="20"
            value={settings.quiz_default_count}
            onChange={(e) => setSettings({ ...settings, quiz_default_count: parseInt(e.target.value) })}
            className="w-full"
          />
          <p className="mt-1 text-xs text-gray-400">{settings.quiz_default_count} 题</p>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">暗色模式</label>
            <p className="text-xs text-gray-400">切换深色/浅色主题</p>
          </div>
          <button
            onClick={() => {
              const newMode = !settings.dark_mode;
              setSettings({ ...settings, dark_mode: newMode });
              document.documentElement.classList.toggle('dark', newMode);
            }}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              settings.dark_mode ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.dark_mode ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Candidate Profile */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          候选人画像
        </h3>

        {/* 简历文件路径展示 + 导入按钮 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            简历
          </label>
          {profile?.resume_file_path ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {profile.resume_file_path}
              </p>
              {profile.resume_text && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 p-3">
                  <p className="text-xs text-gray-400 mb-1">解析摘要（前500字）</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-[12]">
                    {profile.resume_text.slice(0, 500)}
                    {profile.resume_text.length > 500 && '...'}
                  </p>
                </div>
              )}
              {profile.updated_at && (
                <p className="text-xs text-gray-400">
                  最后更新：{new Date(profile.updated_at).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mb-2">尚未导入简历</p>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" onClick={handleImportResume}>
              导入 PDF 简历
            </Button>
            {profile?.resume_file_path && (
              <Button variant="secondary" onClick={handleClearProfile}>
                清空画像
              </Button>
            )}
          </div>
          {profileMessage && (
            <p className={`mt-2 text-xs ${profileMessage.includes('失败') ? 'text-red-600' : 'text-green-600'}`}>
              {profileMessage}
            </p>
          )}
        </div>

        {/* 求职背景 textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            求职背景
          </label>
          <textarea
            value={profile?.job_context || ''}
            onChange={(e) => setProfile(prev => prev
              ? { ...prev, job_context: e.target.value }
              : { resume_file_path: null, resume_text: null, job_context: e.target.value, updated_at: null }
            )}
            placeholder="例如：目标岗位、工作年限、期望方向、公司偏好..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
          />
          <p className="mt-1 text-xs text-gray-400">求职背景会帮助 AI 生成更个性化的学习计划</p>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button onClick={handleSave} loading={saving}>
          保存设置
        </Button>
        {message && (
          <span className={`text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
