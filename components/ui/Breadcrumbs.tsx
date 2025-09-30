import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { BREADCRUMB_NAMES } from '../../constants';
import { ChevronRightIcon, HomeIcon } from './Icons';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on the homepage itself
  if (location.pathname === '/') {
    return null;
  }
  
  // Always start with a link to home
  const breadcrumbItems = [
      { name: BREADCRUMB_NAMES['/'], path: '/' }
  ];

  let currentPath = '';
  for (const name of pathnames) {
    currentPath += `/${name}`;
    if (BREADCRUMB_NAMES[currentPath]) {
      breadcrumbItems.push({ name: BREADCRUMB_NAMES[currentPath], path: currentPath });
    }
  }

  // If there's only the "Home" item, but we're not on the homepage, it means the current page is not in our map.
  // In this case, it's better to show nothing than a single "Home" link.
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb">
      <ol className="flex items-center space-x-1.5 text-sm">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={item.path} className="flex items-center">
              {/* Render the separator before the item, except for the first one */}
              {index > 0 && <ChevronRightIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0" />}

              <div className="ml-1.5">
                {isLast ? (
                  <span className="font-semibold text-neutral-700 dark:text-neutral-200" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.path}
                    className="text-neutral-500 dark:text-neutral-400 hover:underline hover:text-primary-600 dark:hover:text-primary-400 flex items-center"
                    title={item.name}
                  >
                    {item.path === '/' ? <HomeIcon className="h-5 w-5 flex-shrink-0" /> : item.name}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
