import React, { useState, useEffect } from 'react';
import Button from './Button';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { CookieConsentData } from '../../types';

// A self-contained Toggle Switch component for this banner
const ToggleSwitch: React.FC<{ id: string; label: string; checked: boolean; onChange: () => void; disabled?: boolean }> = ({ id, label, checked, onChange, disabled = false }) => {
  return (
    <div className="flex items-center justify-between py-2 sm:flex-col sm:items-start sm:justify-start md:flex-row md:items-center">
      <span className={`text-sm font-semibold mb-2 sm:mb-2 md:mb-0 ${disabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-100'}`}>{label}</span>
      <label htmlFor={id} className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input 
          type="checkbox" 
          id={id} 
          className="sr-only peer" 
          checked={checked} 
          onChange={onChange}
          disabled={disabled}
        />
        <div className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 transition-colors duration-300 ${disabled ? 'bg-neutral-200 dark:bg-neutral-600' : 'peer-checked:bg-emerald-500 bg-neutral-200 dark:bg-neutral-600'}`}></div>
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 peer-checked:translate-x-5`}></span>
      </label>
    </div>
  );
};

// Accordion Item for the Details tab
const AccordionItem: React.FC<{
  title: string;
  children: React.ReactNode;
  toggleContent: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ title, children, toggleContent, isOpen, onToggle }) => (
  <div className="border-b border-neutral-200 dark:border-neutral-700 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center p-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
      aria-expanded={isOpen}
    >
      <span className="font-semibold text-neutral-800 dark:text-neutral-100">{title}</span>
      <div className="flex items-center space-x-4">
        {toggleContent}
        {isOpen ? <ChevronUpIcon className="h-5 w-5 text-neutral-500" /> : <ChevronDownIcon className="h-5 w-5 text-neutral-500" />}
      </div>
    </button>
    {isOpen && (
      <div className="p-3 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/30">
        {children}
      </div>
    )}
  </div>
);


const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'consent' | 'details' | 'about'>('consent');
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { updateUserCookieConsent } = useData();


  const [consent, setConsent] = useState({
    necessary: true,
    preferences: true,
    statistics: true,
    marketing: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
        const consentGiven = localStorage.getItem('cookie_consent');
        if (!consentGiven) {
          setShowBanner(true);
        }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (consentData: Omit<typeof consent, 'necessary'>) => {
    const fullConsentData: CookieConsentData = {
        ...consentData,
        timestamp: new Date().toISOString()
    };
    
    // Always save to localStorage to control banner visibility for this browser
    localStorage.setItem('cookie_consent', JSON.stringify(fullConsentData));

    // If a user is logged in, save their consent to their profile
    if (user && updateUserCookieConsent) {
        updateUserCookieConsent(user.id, fullConsentData);
    }
    
    setShowBanner(false);
  };

  const handleToggle = (category: keyof Omit<typeof consent, 'necessary'>) => {
    setConsent(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleDeny = () => {
    saveConsent({
      preferences: false,
      statistics: false,
      marketing: false,
    });
  };

  const handleAllowSelection = () => {
    const { necessary, ...selection } = consent;
    saveConsent(selection);
  };

  const handleAllowAll = () => {
    const allAllowed = {
      preferences: true,
      statistics: true,
      marketing: true,
    };
    setConsent({ ...consent, ...allAllowed}); // Sync state before saving
    saveConsent(allAllowed);
  };

  if (!showBanner) {
    return null;
  }
  
  const renderConsentTab = () => (
    <>
      <h2 id="cookie-consent-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">Acest site web folosește cookie-uri</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
        Pentru a vă oferi o experiență mai bună în utilizarea serviciilor noastre, folosim cookie-uri pentru analiza datelor și funcționalitatea corespunzătoare a site-ului.
      </p>
      <div className="my-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x sm:divide-neutral-200 sm:dark:divide-neutral-700">
              <div className="px-2 sm:pr-4">
                <ToggleSwitch id="necessary_consent" label="Necesare" checked={true} disabled={true} onChange={() => {}} />
              </div>
              <div className="px-2 sm:px-4">
                <ToggleSwitch id="preferences_consent" label="Preferințe" checked={consent.preferences} onChange={() => handleToggle('preferences')} />
              </div>
              <div className="px-2 sm:px-4">
                <ToggleSwitch id="statistics_consent" label="Statistici" checked={consent.statistics} onChange={() => handleToggle('statistics')} />
              </div>
              <div className="px-2 sm:pl-4">
                <ToggleSwitch id="marketing_consent" label="Marketing" checked={consent.marketing} onChange={() => handleToggle('marketing')} />
              </div>
          </div>
      </div>
    </>
  );

  const renderDetailsTab = () => (
    <div className="space-y-1">
      <AccordionItem
        title="Necesare"
        isOpen={expandedDetails === 'necessary'}
        onToggle={() => setExpandedDetails(expandedDetails === 'necessary' ? null : 'necessary')}
        toggleContent={<ToggleSwitch id="necessary_details" label="" checked={true} disabled={true} onChange={() => {}} />}
      >
        <p>Cookie-urile necesare ajută la a face un site web utilizabil, permițând funcții de bază precum navigarea în pagină și accesul la zonele securizate ale site-ului. Site-ul nu poate funcționa corespunzător fără aceste cookie-uri.</p>
        <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
                <thead className="text-neutral-500 dark:text-neutral-400"><tr><th className="p-1 font-semibold">Cookie</th><th className="p-1 font-semibold">Furnizor</th><th className="p-1 font-semibold">Scop</th><th className="p-1 font-semibold">Expirare</th></tr></thead>
                <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">session_id</td><td className="p-1">Banca Comună</td><td className="p-1">Menține sesiunea utilizatorului după autentificare.</td><td className="p-1">Sesiune</td></tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">cookie_consent</td><td className="p-1">Banca Comună</td><td className="p-1">Stochează starea consimțământului pentru cookie-uri al utilizatorului pentru domeniul curent.</td><td className="p-1">1 an</td></tr>
                </tbody>
            </table>
        </div>
      </AccordionItem>
      <AccordionItem
        title="Preferințe"
        isOpen={expandedDetails === 'preferences'}
        onToggle={() => setExpandedDetails(expandedDetails === 'preferences' ? null : 'preferences')}
        toggleContent={<ToggleSwitch id="preferences_details" label="" checked={consent.preferences} onChange={() => handleToggle('preferences')} />}
      >
        <p>Cookie-urile de preferință permit unui site web să rețină informații care modifică modul în care site-ul se comportă sau arată, precum limba preferată sau regiunea în care vă aflați.</p>
        <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
                 <thead className="text-neutral-500 dark:text-neutral-400"><tr><th className="p-1 font-semibold">Cookie</th><th className="p-1 font-semibold">Furnizor</th><th className="p-1 font-semibold">Scop</th><th className="p-1 font-semibold">Expirare</th></tr></thead>
                <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">theme</td><td className="p-1">Banca Comună</td><td className="p-1">Salvează schema de culori preferată a utilizatorului (luminos/întunecat).</td><td className="p-1">1 an</td></tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">accentPalette</td><td className="p-1">Banca Comună</td><td className="p-1">Stochează culoarea de accent selectată de utilizator pentru interfață.</td><td className="p-1">1 an</td></tr>
                </tbody>
            </table>
        </div>
      </AccordionItem>
      <AccordionItem
        title="Statistici"
        isOpen={expandedDetails === 'statistics'}
        onToggle={() => setExpandedDetails(expandedDetails === 'statistics' ? null : 'statistics')}
        toggleContent={<ToggleSwitch id="statistics_details" label="" checked={consent.statistics} onChange={() => handleToggle('statistics')} />}
      >
        <p>Cookie-urile de statistică ajută proprietarii de site-uri web să înțeleagă cum interacționează vizitatorii cu site-urile web prin colectarea și raportarea anonimă a informațiilor.</p>
         <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
                <thead className="text-neutral-500 dark:text-neutral-400"><tr><th className="p-1 font-semibold">Cookie</th><th className="p-1 font-semibold">Furnizor</th><th className="p-1 font-semibold">Scop</th><th className="p-1 font-semibold">Expirare</th></tr></thead>
                <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">_ga</td><td className="p-1">Google</td><td className="p-1">Înregistrează un ID unic care este utilizat pentru a genera date statistice despre modul în care vizitatorul folosește site-ul.</td><td className="p-1">2 ani</td></tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">_gid</td><td className="p-1">Google</td><td className="p-1">Folosit pentru a distinge utilizatorii în scopuri statistice.</td><td className="p-1">24 de ore</td></tr>
                </tbody>
            </table>
        </div>
      </AccordionItem>
      <AccordionItem
        title="Marketing"
        isOpen={expandedDetails === 'marketing'}
        onToggle={() => setExpandedDetails(expandedDetails === 'marketing' ? null : 'marketing')}
        toggleContent={<ToggleSwitch id="marketing_details" label="" checked={consent.marketing} onChange={() => handleToggle('marketing')} />}
      >
        <p>Cookie-urile de marketing sunt utilizate pentru a urmări vizitatorii pe site-uri web. Intenția este de a afișa reclame relevante și antrenante pentru utilizatorul individual și, prin urmare, mai valoroase pentru editori și agenții de publicitate terțe.</p>
         <div className="overflow-x-auto mt-2">
            <table className="w-full text-left text-xs">
                <thead className="text-neutral-500 dark:text-neutral-400"><tr><th className="p-1 font-semibold">Cookie</th><th className="p-1 font-semibold">Furnizor</th><th className="p-1 font-semibold">Scop</th><th className="p-1 font-semibold">Expirare</th></tr></thead>
                <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">_fbp</td><td className="p-1">Facebook</td><td className="p-1">Folosit de Facebook pentru a livra o serie de produse publicitare, cum ar fi licitarea în timp real de la agenți de publicitate terți.</td><td className="p-1">3 luni</td></tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700"><td className="p-1 font-mono">IDE</td><td className="p-1">Google</td><td className="p-1">Folosit de Google DoubleClick pentru a înregistra și raporta acțiunile utilizatorului în vederea măsurării eficacității reclamelor.</td><td className="p-1">1 an</td></tr>
                </tbody>
            </table>
        </div>
      </AccordionItem>
    </div>
  );

  const renderAboutTab = () => (
     <div className="space-y-4 text-sm text-neutral-600 dark:text-neutral-300">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Despre Cookie-uri pe Acest Site</h3>
        <p>Cookie-urile sunt fișiere text mici care sunt plasate pe dispozitivul dvs. de către site-urile web pe care le vizitați. Acestea sunt utilizate pe scară largă pentru a face site-urile web să funcționeze, sau să funcționeze mai eficient, precum și pentru a furniza informații proprietarilor site-ului.</p>
        <p>Folosim cookie-uri pentru a îmbunătăți experiența dvs. de navigare, pentru a servi conținut personalizat și pentru a analiza traficul nostru. Făcând clic pe "Permite toate", vă dați consimțământul pentru utilizarea cookie-urilor. Puteți schimba opțiunile de consimțământ în orice moment din fila "Detalii".</p>
        <div>
            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Operator de Date</h4>
            <p>Banca Comună de Investiții</p>
        </div>
        <div>
            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Mai Multe Informații</h4>
            <p>Pentru mai multe informații despre modul în care gestionăm datele dvs., vă rugăm să citiți <a href="#/privacy" className="text-emerald-500 hover:underline">Politica noastră de Confidențialitate</a> (fictivă).</p>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Consimțământul dvs. se aplică domeniului: {window.location.hostname}</p>
    </div>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-end p-2 sm:p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
      <div className="w-full max-w-5xl bg-white dark:bg-neutral-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        <header className="p-4 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700 flex-wrap gap-2">
            <div className="flex items-center gap-2">
                 <svg className="h-8 w-8 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622A11.99 11.99 0 0018.402 6a11.959 11.959 0 01-2.036-1.286m0 0A11.953 11.953 0 0112 2.25c-2.646 0-5.063.82-7.036 2.214z" />
                </svg>
                <span className="font-bold text-lg text-neutral-800 dark:text-neutral-100">Banca Comună</span>
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">Sistem oferit de Usercentrics</span>
        </header>

        <nav className="border-b border-neutral-200 dark:border-neutral-700 px-4">
             <div className="flex space-x-8">
                 <button onClick={() => setActiveTab('consent')} className={`py-3 px-1 border-b-2 font-semibold text-sm focus:outline-none ${activeTab === 'consent' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
                     Consimțământ
                 </button>
                 <button onClick={() => setActiveTab('details')} className={`py-3 px-1 border-b-2 font-semibold text-sm focus:outline-none ${activeTab === 'details' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
                     Detalii
                 </button>
                 <button onClick={() => setActiveTab('about')} className={`py-3 px-1 border-b-2 font-semibold text-sm focus:outline-none ${activeTab === 'about' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'}`}>
                     Despre
                 </button>
             </div>
        </nav>
        
        <div className="flex-grow overflow-y-auto">
            <main className="p-4 sm:p-6">
                {activeTab === 'consent' && renderConsentTab()}
                {activeTab === 'details' && renderDetailsTab()}
                {activeTab === 'about' && renderAboutTab()}
            </main>
        </div>

        <footer className="p-4 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3">
           <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" onClick={handleDeny} className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:ring-emerald-400">
                    Refuză
                </Button>
                <Button variant="outline" onClick={handleAllowSelection} className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 focus:ring-emerald-400">
                    Permite selecția
                </Button>
                <Button variant="primary" onClick={handleAllowAll} className="w-full bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-400 text-white">
                    Permite toate
                </Button>
           </div>
        </footer>

      </div>
    </div>
  );
};

export default CookieConsent;