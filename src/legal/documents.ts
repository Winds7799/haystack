/**
 * The legal text, kept as data so one screen can render all of it and the
 * wording lives in one place.
 *
 * These describe what the app actually does, in plain language. They are not
 * legal advice, and the placeholders below have to be filled in before this
 * ships — see PUBLISHER.
 */

/** Fill these in. The App Store will ask for the same contact details. */
export const PUBLISHER = {
  name: 'the developer of Haystack',
  /** A support address you are happy to publish. Required for the App Store. */
  contact: 'REPLACE WITH YOUR SUPPORT EMAIL',
  /** Where you are, which decides whose law governs the terms. */
  jurisdiction: 'REPLACE WITH YOUR COUNTRY OR STATE',
} as const;

/** True while the placeholders are still placeholders. */
export function legalIncomplete(): boolean {
  return PUBLISHER.contact.startsWith('REPLACE') || PUBLISHER.jurisdiction.startsWith('REPLACE');
}

export const LAST_UPDATED = '28 August 2026';

export interface Section {
  heading: string;
  body: string[];
}

export interface Document {
  id: 'privacy' | 'terms';
  title: string;
  sections: Section[];
}

const PRIVACY: Document = {
  id: 'privacy',
  title: 'Privacy',
  sections: [
    {
      heading: 'The short version',
      body: [
        'Haystack has no accounts and asks for no sign in. Your progress lives on your device. Two things can leave it: a leaderboard entry, if you choose to post one, and the data Google needs to show you an ad, if you choose to watch one.',
      ],
    },
    {
      heading: 'What stays on your device',
      body: [
        'Your best times, stars, attempts, settings and the name you chose are stored on the device and nowhere else. Deleting the app deletes them.',
      ],
    },
    {
      heading: 'The leaderboard',
      body: [
        'If you post a time, this is sent to our database: the name you typed, the level, your time, your stars, whether you used a hint, and a random identifier generated on your device the first time you opened the app.',
        'That identifier is not your device ID, your advertising ID, or anything issued by Apple or Google. It is a random number that exists so your own entry can be updated rather than duplicated. It is never shown to other players and never sent to anyone else.',
        'We do not collect your email address, your location, your contacts, or anything that identifies you personally. The name you type is the only thing other people see, so do not use one you would rather keep private.',
      ],
    },
    {
      heading: 'Advertising',
      body: [
        'Hints are paid for by watching an ad, supplied by Google AdMob. If you never ask for a hint, no ad is ever requested and no consent form is ever shown.',
        'When an ad is requested, Google may collect device and usage information to select and measure it. What Google does with that is covered by its own policy at policies.google.com/technologies/partner-sites.',
        'In the EU and UK you are asked for consent before the first ad, and you can change your answer at any time under Settings, Ad privacy choices.',
      ],
    },
    {
      heading: 'Removing your data',
      body: [
        'Settings, Remove my leaderboard entry deletes every score this device has posted, immediately and permanently.',
        'Settings, Reset progress clears everything held on the device.',
        'For anything else, write to the address at the end of this document.',
      ],
    },
    {
      heading: 'Children',
      body: [
        'Haystack is not directed at children under 13. We do not knowingly collect data from them. If you believe a child has posted an entry, tell us and it will be removed.',
      ],
    },
  ],
};

const TERMS: Document = {
  id: 'terms',
  title: 'Terms',
  sections: [
    {
      heading: 'Using the game',
      body: [
        'Haystack is provided as it is, for your personal use. You may not resell it, take it apart, or use it to break the law.',
      ],
    },
    {
      heading: 'Names on the leaderboard',
      body: [
        'There is no tolerance for objectionable names. Anything abusive, hateful, sexual, threatening, impersonating another person, or otherwise offensive is not allowed on the board.',
        'Every entry carries a report control. Reported names are reviewed and removed within 24 hours, and the device that posted one may be blocked from posting again.',
        'By posting a name you accept these terms and confirm the name is yours to use.',
      ],
    },
    {
      heading: 'Hints and advertising',
      body: [
        'Hints are given in exchange for watching an ad. Nothing in the game is bought with money and there are no purchases of any kind.',
        'If no ad can be shown, the hint is given anyway. Leaving an ad before it finishes forfeits that hint.',
      ],
    },
    {
      heading: 'No warranty',
      body: [
        'The game is provided without warranty of any kind. To the extent the law allows, we are not liable for any loss arising from using it, and we may change or withdraw it at any time.',
      ],
    },
  ],
};

export const DOCUMENTS: readonly Document[] = [PRIVACY, TERMS];
