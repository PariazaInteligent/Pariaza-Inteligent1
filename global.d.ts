// global.d.ts
// This file augments the global JSX namespace to include the custom 'stripe-buy-button' element.

import * as React from 'react';

// React.HTMLAttributes should be globally available from @types/react

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Defines the custom element 'stripe-buy-button' for JSX.
      // This allows using <stripe-buy-button> in TSX files with type checking
      // for its specific attributes, in addition to standard HTML attributes.
      'stripe-buy-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'buy-button-id': string;
        'publishable-key': string;
        // children and other standard HTML attributes are included via React.DetailedHTMLProps
      };
    }
  }
}

// Add this line to make it an external module
export {};