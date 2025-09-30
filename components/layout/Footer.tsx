import React from 'react';
import { APP_VERSION, UI_TEXT_ROMANIAN } from '../../constants';

const Footer: React.FC = () => {
  return (
    <footer className="py-4 px-6 text-center text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-700">
      <p>
        &copy; {new Date().getFullYear()} {UI_TEXT_ROMANIAN.appName}. Toate drepturile rezervate.
      </p>
      <p>
        Versiune: {APP_VERSION}
      </p>
    </footer>
  );
};

export default Footer;
