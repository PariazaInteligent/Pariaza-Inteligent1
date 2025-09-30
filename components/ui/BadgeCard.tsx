import React, { useState } from 'react';
import { UserBadge } from '../../types';
import { BADGE_DEFINITIONS, UI_TEXT_ROMANIAN } from '../../constants';
import { formatDate } from '../../utils/helpers';

interface BadgeCardProps {
  badge: UserBadge;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const badgeDef = BADGE_DEFINITIONS[badge.badgeType];

  if (!badgeDef) {
    return null; // Don't render if badge definition is missing
  }

  const IconComponent = badgeDef.icon;

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="badge-card-container flex justify-center items-center">
      <div
        className={`badge-card ${isFlipped ? 'flipped' : ''}`}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label={`Vezi detalii pentru ecusonul ${badgeDef.name}`}
      >
        {/* Card Front */}
        <div className="badge-card-face badge-card-front">
          <img className="badge-card-overlay-edge" src="https://assets.codepen.io/2153413/card-edge.png" alt="" />
          <svg className="badge-card-overlay-texture" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax meet" viewBox="0 0 630 880">
            <pattern id={`card-texture-${badge.badgeType}`} width="4" height="4" patternTransform="scale(3)" patternUnits="userSpaceOnUse">
              <path fill="#000000" d="M1 3h1v1H1V3zm2-2h1v1H3V1z"></path>
            </pattern>
            <rect x="0" y="0" width="630" height="880" fill={`url(#card-texture-${badge.badgeType})`} opacity=".1"/>
          </svg>
          <h2 className="badge-card-name text-neutral-800 dark:text-neutral-100">{badgeDef.name}</h2>
          <div className="badge-card-art">
             <IconComponent className="badge-icon" />
          </div>
          <div className="badge-card-source">
            <p>Ecuson Câștigat</p>
            <p>{UI_TEXT_ROMANIAN.appName}</p>
          </div>
        </div>

        {/* Card Back */}
        <div className="badge-card-face badge-card-back">
          <img className="badge-card-overlay-edge" src="https://assets.codepen.io/2153413/card-edge.png" alt="" />
           <svg className="badge-card-overlay-texture" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMax meet" viewBox="0 0 630 880">
            <pattern id={`card-texture-back-${badge.badgeType}`} width="4" height="4" patternTransform="scale(3)" patternUnits="userSpaceOnUse">
              <path fill="#000000" d="M1 3h1v1H1V3zm2-2h1v1H3V1z"></path>
            </pattern>
            <rect x="0" y="0" width="630" height="880" fill={`url(#card-texture-back-${badge.badgeType})`} opacity=".25"/>	
          </svg>
          <div className="badge-card-back-content">
            <p className="badge-description">{badgeDef.description}</p>
            {badge.details && <p className="badge-description font-semibold text-primary-200">({badge.details})</p>}
            <p className="badge-earned-date">Câștigat la: {formatDate(badge.earnedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgeCard;
