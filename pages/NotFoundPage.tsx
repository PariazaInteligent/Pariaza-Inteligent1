import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UI_TEXT_ROMANIAN } from '../constants'; // APP_VERSION removed, will come from Footer
import { ExclamationTriangleIcon } from '../components/ui/Icons'; 
import Footer from '../components/layout/Footer'; // Import Footer

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center animate-fade-in">
      <div className="flex-grow flex flex-col items-center justify-center w-full">
        <Card 
          className="max-w-lg w-full"
          icon={<ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-6" />}
        >
          <h1 className="text-5xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
            Oops! Pagina nu a fost găsită.
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 mb-8">
            Se pare că pagina pe care o cauți nu există sau a fost mutată. Te rugăm să verifici adresa URL sau să te întorci la pagina principală.
          </p>
          <Link to="/">
            <Button variant="primary" size="lg">
              {UI_TEXT_ROMANIAN.home}
            </Button>
          </Link>
        </Card>
      </div>
      <Footer /> {/* Use Footer component */}
    </div>
  );
};

export default NotFoundPage;