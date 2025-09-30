import React, { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { ArrowRightCircleIcon } from '../components/ui/Icons';
import { useTheme } from '../contexts/ThemeContext';

gsap.registerPlugin(ScrollTrigger);

// Data for the showcase sections, adapted for the application's context
const showcaseSections = [
    {
        title: "Înregistrare & Verificare",
        description: "Creează-ți contul și parcurge procesul de identificare pentru a-ți securiza contul și a începe să investești.",
        image: "https://images.unsplash.com/photo-1585079542156-2755d9c8a094?q=80&w=1974&auto=format&fit=crop",
        bgColor: "#E0F2FE", // light sky-100
        darkBgColor: "#0c4a6e", // dark sky-900
        ctaColor: "#7DD6FF"
    },
    {
        title: "Adaugă Fonduri în Cont",
        description: "Devino un investitor activ adăugând fonduri în contul tău prin metode de plată sigure și verificate. Capitalul tău este pregătit pentru oportunități.",
        image: "https://images.unsplash.com/photo-1621262829281-22e6b26d3ec2?q=80&w=1974&auto=format&fit=crop",
        bgColor: "#ECFDF5", // light green-100
        darkBgColor: "#065f46", // dark green-800
        ctaColor: "#A7F3D0"
    },
    {
        title: "Investiții Inteligente",
        description: "Platforma gestionează investițiile în pariuri sportive pe baza unor strategii avansate. Rolul tău este să ai fonduri în cont, noi ne ocupăm de restul.",
        image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop",
        bgColor: "#FEF2F2", // light red-100
        darkBgColor: "#991b1b", // dark red-800
        ctaColor: "#FECACA"
    },
    {
        title: "Urmărește Creșterea",
        description: "Vezi zilnic în profilul tău cum evoluează investițiile, portofoliul și randamentul obținut. Transparență totală asupra performanței tale.",
        image: "https://images.unsplash.com/photo-1642784534209-338276a6b5a3?q=80&w=1932&auto=format&fit=crop",
        bgColor: "#FFFBEB", // light yellow-100
        darkBgColor: "#92400e", // dark amber-800
        ctaColor: "#FDE68A"
    },
    {
        title: "Primește Profitul Generat",
        description: "Fondurile, inclusiv profitul net, sunt calculate și distribuite zilnic în contul tău. Tu deții controlul asupra câștigurilor.",
        image: "https://images.unsplash.com/photo-1593672715438-d88a70629e28?q=80&w=2070&auto=format&fit=crop",
        bgColor: "#F5F3FF", // light purple-100
        darkBgColor: "#5b21b6", // dark violet-700
        ctaColor: "#C4B5FD"
    }
];

const ArchShowcase: React.FC = () => {
    const mainRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const { theme } = useTheme();
    
    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const isDark = document.documentElement.classList.contains('dark');
            const bgColors = showcaseSections.map(s => isDark ? s.darkBgColor : s.bgColor);
            const sections = gsap.utils.toArray<HTMLElement>('.how-it-works-arch__info');
            const images = gsap.utils.toArray<HTMLDivElement>(".how-it-works-arch__right .img-wrapper");

            ScrollTrigger.matchMedia({
                "(min-width: 769px)": function () {
                    // Pin the right container
                    ScrollTrigger.create({
                        trigger: ".how-it-works-arch",
                        start: "top top",
                        end: "bottom bottom",
                        pin: ".how-it-works-arch__right"
                    });
                    
                    // Set initial state for images (all hidden except first)
                    gsap.set(images, { autoAlpha: 0 }); // Use autoAlpha for better performance
                    gsap.set(images[0], { autoAlpha: 1 });

                    sections.forEach((section, i) => {
                        // Animate background color
                        gsap.to(mainRef.current, {
                            backgroundColor: bgColors[i],
                            ease: "none",
                            scrollTrigger: {
                                trigger: section,
                                start: "top center",
                                end: "bottom center",
                                toggleActions: "play reverse play reverse",
                            }
                        });

                        // **CORRECTED IMAGE SWAPPING LOGIC**
                        // Create a trigger for each section to control image visibility
                        ScrollTrigger.create({
                            trigger: section,
                            start: "top center",
                            end: "bottom center",
                            // When scrolling down and the section enters...
                            onEnter: () => gsap.to(images, { 
                                autoAlpha: (index) => (index === i ? 1 : 0), // Show current image, hide others
                                duration: 0.5,
                                ease: 'power2.inOut',
                                overwrite: 'auto'
                            }),
                             // When scrolling up and the section re-enters...
                            onEnterBack: () => gsap.to(images, {
                                autoAlpha: (index) => (index === i ? 1 : 0), // Show current image, hide others
                                duration: 0.5,
                                ease: 'power2.inOut',
                                overwrite: 'auto'
                            })
                        });
                    });
                },
                "(max-width: 768px)": function() {
                    sections.forEach((section, index) => {
                        // Animate background color on mobile
                        gsap.to(mainRef.current, {
                            backgroundColor: bgColors[index],
                            scrollTrigger: {
                                trigger: section,
                                start: "top 80%",
                                end: "bottom 20%",
                                toggleActions: "play reverse play reverse",
                            }
                        });
                    });
                }
            });
        }, mainRef);

        return () => ctx.revert();
    }, [theme]); // Rerun effect when theme changes to get correct colors

    const getLinkPath = () => {
        if (!user) return "/login";
        return user.role === Role.ADMIN ? "/admin/dashboard" : "/user/dashboard";
    };

    return (
        <div ref={mainRef} className="how-it-works-body bg-neutral-100 dark:bg-neutral-900">
            <div className="how-it-works-container">
                <div className="how-it-works-spacer"></div>

                <div className="how-it-works-arch">
                    <div className="how-it-works-arch__left">
                        {showcaseSections.map((section, index) => (
                            <div key={index} className="how-it-works-arch__info">
                                <div className="content">
                                    <h2 className="header text-neutral-800 dark:text-neutral-100">{section.title}</h2>
                                    <p className="desc text-neutral-600 dark:text-neutral-300">{section.description}</p>
                                    <Link 
                                        to={getLinkPath()}
                                        className="link"
                                        style={{ backgroundColor: section.ctaColor, color: '#121212' }}
                                    >
                                        <span>Începe Acum</span>
                                        <ArrowRightCircleIcon className="h-5 w-5 ml-1"/>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="how-it-works-arch__right">
                        {showcaseSections.map((section, index) => (
                             <div key={index} className="img-wrapper">
                                <img src={section.image} alt={section.title} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="how-it-works-spacer"></div>
            </div>
        </div>
    );
};

const HowItWorksPage: React.FC = () => {
    return <ArchShowcase />;
};

export default HowItWorksPage;