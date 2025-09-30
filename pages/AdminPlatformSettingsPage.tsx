import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { PlatformSetting, AdminPermission, NotificationType, PlatformSettingKey } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { WrenchScrewdriverIcon } from '../components/ui/Icons';
import SwitchToggle from '../components/ui/SwitchToggle';

const AdminPlatformSettingsPage: React.FC = () => {
  const { user: adminUser } = useAuth();
  const { appData, loading, updatePlatformSettings } = useData();
  const { addNotification } = useNotifications();

  const [settingsFormData, setSettingsFormData] = useState<Record<PlatformSettingKey, string>>({} as Record<PlatformSettingKey, string>);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (appData?.platformSettings) {
      const initialFormData = appData.platformSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<PlatformSettingKey, string>);
      setSettingsFormData(initialFormData);
    }
  }, [appData?.platformSettings]);

  const canManageSettings = adminUser?.isGlobalAdmin || adminUser?.adminPermissions?.[AdminPermission.CAN_MANAGE_PLATFORM_SETTINGS];

  if (loading || !appData || !adminUser) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (!canManageSettings) {
    return (
      <Card title={UI_TEXT_ROMANIAN.accessDenied} className="text-center">
        <p>{UI_TEXT_ROMANIAN.accessDenied} Nu aveți permisiunea de a gestiona setările platformei.</p>
      </Card>
    );
  }

  const handleInputChange = (key: PlatformSettingKey, value: string) => {
    setSettingsFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedSettings: PlatformSetting[] = appData.platformSettings.map(setting => ({
        ...setting,
        value: settingsFormData[setting.key] !== undefined ? settingsFormData[setting.key] : setting.value,
      }));
      await updatePlatformSettings(updatedSettings);
    } catch (error) {
      addNotification(UI_TEXT_ROMANIAN.failedToSaveSettings, NotificationType.ERROR);
      console.error("Failed to save platform settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <WrenchScrewdriverIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.adminPlatformSettingsTitle}
      </h1>

      <Card>
        <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
          {UI_TEXT_ROMANIAN.platformSettingsDescription}
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {appData.platformSettings.map(setting => {
            if (setting.type === 'boolean') {
              return (
                 <div key={setting.key} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                   <SwitchToggle
                      id={setting.key}
                      label={setting.label}
                      description={setting.description}
                      checked={settingsFormData[setting.key] === 'true'}
                      onChange={(isChecked) => handleInputChange(setting.key, isChecked ? 'true' : 'false')}
                   />
                </div>
              );
            }
            return (
              <div key={setting.key} className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <label htmlFor={setting.key} className="block text-md font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                  {setting.label}
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{setting.description}</p>
                {setting.type === 'textarea' ? (
                  <Textarea
                    id={setting.key}
                    name={setting.key}
                    value={settingsFormData[setting.key] || ''}
                    onChange={(e) => handleInputChange(setting.key, e.target.value)}
                    rows={3}
                    className="mt-1 block w-full"
                  />
                ) : (
                  <Input
                    id={setting.key}
                    name={setting.key}
                    type={setting.type === 'number' ? 'number' : 'text'}
                    value={settingsFormData[setting.key] || ''}
                    onChange={(e) => handleInputChange(setting.key, e.target.value)}
                    className="mt-1 block w-full"
                  />
                )}
              </div>
            );
          })}

          <div className="flex justify-end pt-4">
            <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
              {UI_TEXT_ROMANIAN.saveSettingsButton}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AdminPlatformSettingsPage;