import React, { useState, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN, PREDEFINED_FAQS, PREDEFINED_GLOSSARY_TERMS } from '../constants';
import { FAQItem, NotificationType, GlossaryTermItem } from '../types';
// FIX: Corrected the icon import to bring in the actual BookOpenIcon and remove the faulty alias.
import { QuestionMarkCircleIcon, ChevronDownIcon, ChevronUpIcon, SparklesIcon, BookOpenIcon } from '../components/ui/Icons';

const HelpCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [expandedGlossaryTerm, setExpandedGlossaryTerm] = useState<string | null>(null); // New state for glossary
  const [userQuestion, setUserQuestion] = useState<string>('');
  const [geminiResponse, setGeminiResponse] = useState<string | null>(null);
  const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  const toggleFaq = (question: string) => {
    setExpandedFaq(expandedFaq === question ? null : question);
  };

  const toggleGlossaryTerm = (term: string) => {
    setExpandedGlossaryTerm(expandedGlossaryTerm === term ? null : term);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) {
      addNotification("Te rog introdu o întrebare.", NotificationType.WARNING);
      return;
    }

    if (!process.env.API_KEY) {
      addNotification(UI_TEXT_ROMANIAN.geminiApiKeyMissingHelp, NotificationType.ERROR);
      setGeminiError(UI_TEXT_ROMANIAN.geminiApiKeyMissingHelp);
      return;
    }

    setIsGeminiLoading(true);
    setGeminiResponse(null);
    setGeminiError(null);

    const platformDescription = "Banca Comună de Investiții de la Pariaza Inteligent este o platformă web modernă pentru gestionarea unei bănci comune de pariuri sportive, cu roluri distincte pentru admin și investitori. Include funcții de management al datelor, statistici, și calcul de profit.";
    const faqContext = PREDEFINED_FAQS.map(faq => `Î: ${faq.question}\nR: ${faq.answer}`).join('\n\n');
    const glossaryContext = PREDEFINED_GLOSSARY_TERMS.map(item => `Termen: ${item.term}\nExplicație: ${item.explanation}`).join('\n\n');


    const promptForGemini = `
Context General:
${platformDescription}

Întrebări Frecvente Predefinite (FAQ) ale Platformei:
${faqContext}

Glosar de Termeni ai Platformei:
${glossaryContext}

Întrebarea Utilizatorului:
${userQuestion}
`;

    const systemInstructionForGemini = "Ești un asistent virtual expert pentru platforma 'Banca Comună de Investiții de la Pariaza Inteligent'. Scopul tău principal este să răspunzi la întrebările utilizatorilor despre platformă. Răspunde întotdeauna în limba română, clar, concis și la obiect. Utilizează informațiile din secțiunea 'Întrebări Frecvente Predefinite (FAQ) ale Platformei' și 'Glosar de Termeni ai Platformei' ca sursă primară. Dacă întrebarea utilizatorului se regăsește direct sau este foarte similară cu una din FAQ sau un termen din glosar, prioritizează și reformulează răspunsul respectiv pentru a fi cât mai direct la întrebarea pusă. Dacă întrebarea este mai generală sau nu se regăsește în FAQ/glosar, formulează un răspuns util bazat pe descrierea generală a platformei și pe cunoștințele tale generale despre astfel de platforme. Nu inventa funcționalități care nu sunt menționate. Dacă nu poți oferi un răspuns relevant bazat pe context, indică acest lucru politicos și sugerează utilizatorului să reformuleze întrebarea sau să contacteze un administrator pentru cazuri specifice.";

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptForGemini,
        config: {
            systemInstruction: systemInstructionForGemini,
        }
      });
      
      setGeminiResponse(response.text);
    } catch (error: any) {
      console.error("Gemini API error (Help Center):", error);
      let errorMessage = UI_TEXT_ROMANIAN.geminiError;
      if (error.message) {
        errorMessage += ` Detaliu: ${error.message}`;
      }
      setGeminiError(errorMessage);
      addNotification(errorMessage, NotificationType.ERROR);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <QuestionMarkCircleIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.helpCenterTitle}
      </h1>

      <Card title={UI_TEXT_ROMANIAN.faqSectionTitle}>
        {PREDEFINED_FAQS.length > 0 ? (
          <div className="space-y-3">
            {PREDEFINED_FAQS.map((faq, index) => (
              <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <button
                  onClick={() => toggleFaq(faq.question)}
                  className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-t-lg"
                  aria-expanded={expandedFaq === faq.question}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">{faq.question}</span>
                  {expandedFaq === faq.question ? <ChevronUpIcon className="h-5 w-5 text-neutral-500" /> : <ChevronDownIcon className="h-5 w-5 text-neutral-500" />}
                </button>
                {expandedFaq === faq.question && (
                  <div id={`faq-answer-${index}`} className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 rounded-b-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
        )}
      </Card>

      <Card title={UI_TEXT_ROMANIAN.askGeminiSectionTitle} icon={<SparklesIcon className="h-6 w-6 text-yellow-500"/>}>
        <form onSubmit={handleQuestionSubmit} className="space-y-4">
          <Input
            label="Întrebarea ta:"
            name="userQuestion"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder={UI_TEXT_ROMANIAN.askGeminiInputPlaceholder}
            required
            disabled={isGeminiLoading}
          />
          <Button type="submit" variant="primary" isLoading={isGeminiLoading} disabled={isGeminiLoading}>
            {UI_TEXT_ROMANIAN.askGeminiButton}
          </Button>
        </form>

        {isGeminiLoading && (
          <div className="mt-6 text-center">
            <Spinner />
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{UI_TEXT_ROMANIAN.geminiLoadingResponse}</p>
          </div>
        )}

        {geminiError && !isGeminiLoading && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-200">
            <p>{geminiError}</p>
          </div>
        )}

        {geminiResponse && !isGeminiLoading && !geminiError && (
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-2">Răspuns de la Asistentul Inteligent:</h3>
            <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200 font-sans">{geminiResponse}</pre>
          </div>
        )}
         {!geminiResponse && !isGeminiLoading && !geminiError && userQuestion && (
            <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.geminiNoResults}</p>
        )}
      </Card>

      {/* New Glossary Section */}
      <Card title={UI_TEXT_ROMANIAN.glossarySectionTitle} icon={<BookOpenIcon className="h-6 w-6 text-indigo-500" />}>
        {PREDEFINED_GLOSSARY_TERMS.length > 0 ? (
          <div className="space-y-3">
            {PREDEFINED_GLOSSARY_TERMS.map((item, index) => (
              <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <button
                  onClick={() => toggleGlossaryTerm(item.term)}
                  className="w-full flex justify-between items-center p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-t-lg"
                  aria-expanded={expandedGlossaryTerm === item.term}
                  aria-controls={`glossary-explanation-${index}`}
                >
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">{item.term}</span>
                  {expandedGlossaryTerm === item.term ? <ChevronUpIcon className="h-5 w-5 text-neutral-500" /> : <ChevronDownIcon className="h-5 w-5 text-neutral-500" />}
                </button>
                {expandedGlossaryTerm === item.term && (
                  <div id={`glossary-explanation-${index}`} className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 rounded-b-lg">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-line">{item.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400">{UI_TEXT_ROMANIAN.noDataAvailable}</p>
        )}
      </Card>

    </div>
  );
};

export default HelpCenterPage;
