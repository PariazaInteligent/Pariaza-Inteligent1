
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { ArrowDownTrayIcon } from './Icons';
import { UI_TEXT_ROMANIAN } from '../../constants';

// This type needs to be declared as it's not standard in all TS lib versions for browsers
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      event.preventDefault();
      setDeferredPrompt(event);
      setIsVisible(true);
      console.log('beforeinstallprompt captured by React component.');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const appInstalledHandler = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('PWA installed via React component.');
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
      <Button
        onClick={handleInstallClick}
        variant="primary"
        size="md"
        leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
      >
        {UI_TEXT_ROMANIAN.installApp}
      </Button>
    </div>
  );
};

export default PWAInstallButton;
    