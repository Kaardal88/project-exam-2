import { appName } from "@/components/Stemlock";

/** One address, shared with the FAQ so the three pages cannot disagree. */
export const CONTACT_EMAIL = "kaardal88@gmail.com";

const LAST_UPDATED = "2026-09-10";

const MINIMUM_AGE = 16;

export type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
};

export const terms: LegalDocument = {
  title: "Terms of Use",
  updated: LAST_UPDATED,
  intro: [
    `${appName} is in a closed test phase. Features may change, break or be removed without notice, and neither continuous uptime nor the survival of your data can be guaranteed. Keep your own copies of anything you cannot afford to lose -- audio, stems, lyrics -- for as long as that is true.`,
    "Creating an account or using the service means you accept these terms.",
  ],
  sections: [
    {
      heading: "1. About the service",
      paragraphs: [
        `${appName} is a collaboration platform for bands and artists: a shared workspace for members, projects, songs, stems, versions and the conversation around them.`,
      ],
    },
    {
      heading: "2. Your account",
      bullets: [
        "Register with information that is accurate, and keep it that way.",
        "You are responsible for keeping your password to yourself, and for everything done through your account.",
        `You must be ${MINIMUM_AGE} or older to create an account.`,
        "There is no password reset yet. Losing your password currently means contacting us directly, so choose one you can keep.",
      ],
    },
    {
      heading: "3. Bands, roles and access",
      paragraphs: [
        "A band is a shared workspace. A band leader can invite others in -- members, and project-scoped guests such as a producer, engineer, session musician or manager, who see only the one project they were invited to.",
        "Whoever sends an invitation is responsible for only inviting people with a legitimate reason to be there. What you may do inside a band follows the role you hold, and a band may change or withdraw that role at any time.",
      ],
    },
    {
      heading: "4. Content you upload",
      bullets: [
        "You keep ownership and copyright of everything you upload -- recordings, stems, lyrics, artwork, documents.",
        `Uploading it grants ${appName} a limited right to store, process and display that content for the sole purpose of running the service for you and your band: playback, waveforms, mixdowns, comments and sharing within the band.`,
        "You are responsible for having the right to upload what you upload, and for it not being unlawful.",
        "Deleting your account or your content removes it as described in the Privacy Policy.",
      ],
    },
    {
      heading: "5. What you may not do",
      paragraphs: ["The service may not be used to:"],
      bullets: [
        "upload content you do not have the right to share",
        "harass, threaten or bully other users",
        "attempt to reach accounts, bands, projects or files that are not yours",
        "break the law",
      ],
    },
    {
      heading: "6. Third-party providers",
      paragraphs: [
        "The service runs on third-party hosting for its database and its file storage. Both are named in the Privacy Policy. Downtime or faults originating with those providers are outside our control.",
      ],
    },
    {
      heading: "7. Limitation of liability",
      paragraphs: [
        'The service is provided "as is", which weighs especially heavily while it is in test. To the extent the law allows, we disclaim liability for indirect loss, lost profit and loss of data arising from use of the service. Statutory liability that cannot be waived is not waived by this section.',
      ],
    },
    {
      heading: "8. Changes and closing your account",
      bullets: [
        "Parts of the service may change or disappear, particularly during the test phase.",
        "You may close your account at any time from Settings. The Privacy Policy describes what that does.",
        "These terms may be updated; a significant change will be announced on this page.",
      ],
    },
    {
      heading: "9. Governing law",
      paragraphs: ["These terms are governed by Norwegian law."],
    },
    {
      heading: "10. Contact",
      paragraphs: [`Questions about these terms go to ${CONTACT_EMAIL}.`],
    },
  ],
};

export const privacy: LegalDocument = {
  title: "Privacy Policy",
  updated: LAST_UPDATED,
  intro: [
    `This describes what ${appName} stores about you, why, where it lives and how to get rid of it.`,
    "The short version: what is needed to run the service, and nothing collected for advertising. There is no analytics script, no advertising network and no third-party tracking cookie anywhere in the application.",
  ],
  sections: [
    {
      heading: "1. What we store because you gave it to us",
      paragraphs: ["From registering, and from editing your profile:"],
      bullets: [
        "A username, a handle and an email address.",
        "Your password, only ever as a bcrypt hash. The password itself is never stored and cannot be read back out.",
        "Anything optional you chose to add: biography, country, tags, avatar and header image, social links.",
      ],
    },
    {
      heading: "2. What we store because you made it",
      paragraphs: [
        "The work itself: bands, projects, songs, stems, versions, takes, comments and their history, notes, lyrics, calendar events, uploaded files and artwork, along with who created each one and when.",
        "Invitations you send or receive, and -- during the closed test round -- anything you submit through the feedback button, so that it can be answered.",
      ],
    },
    {
      heading: "3. Cookies",
      paragraphs: ["Two, both strictly necessary, neither used for tracking:"],
      bullets: [
        "bs_session -- your signed-in session, as a token the browser will not let any script read. It lasts seven days.",
        "bs_signed_in -- carries the value 1 and no secret at all. It exists so the page can draw the right menu before the server answers, and it grants access to nothing.",
      ],
    },
    {
      heading: "4. Where it is stored",
      bullets: [
        "The database is Neon (PostgreSQL).",
        "Files -- audio, stems, project documents -- sit in a private Cloudflare R2 bucket, reachable only through links signed for you that then expire.",
        "Avatars, header images and project covers sit in a separate, deliberately public Cloudflare R2 bucket, because they have to render as ordinary images. Treat anything you upload as a profile picture, header or cover as public, even before you make a band public.",
      ],
    },
    {
      heading: "5. Who can see it",
      bullets: [
        "Band content is visible to that band's members, and to a guest for the one project they were invited to.",
        "A band chooses whether its profile is public, unlisted or private, and visitors see only what it publishes. Your own profile is reachable at your handle.",
        "One platform administrator can read the feedback inbox in order to reply to it. That is the whole of it -- not your bands, not your projects, not your files.",
      ],
    },
    {
      heading: "6. Keeping it, and deleting it",
      bullets: [
        "Your account is kept for as long as it exists. Deleting it from Settings removes your account and the content hanging off it immediately, and the page shows you beforehand what that does to each band you are in -- some transfer to another leader, some are deleted with you.",
        "Uploaded files in object storage are not yet swept automatically when an account is deleted, so a stored file may outlive its database row. Write to us and it will be removed by hand.",
        "A few records are kept deliberately: a calendar event you created survives your account deletion, shown as belonging to a deleted user, so that a band's calendar does not develop holes.",
      ],
    },
    {
      heading: "7. Security",
      bullets: [
        "Passwords are hashed with bcrypt.",
        "The session token is httpOnly, so no script on the page can read it, and SameSite=Lax, so the browser withholds it from cross-site requests that change anything.",
        "Permissions are enforced on the server for every request, not by hiding buttons in the interface.",
        "There is no email verification and no password reset yet, and changing your password does not sign you out of other devices. All three are known gaps, stated rather than hidden.",
      ],
    },
    {
      heading: "8. Your rights",
      paragraphs: [
        `Under the GDPR you may ask for a copy of your data, ask for it to be corrected, or ask for it to be deleted. Most of that you can do yourself from Settings; for anything else, write to ${CONTACT_EMAIL} and you will get an answer.`,
      ],
    },
    {
      heading: "9. Changes",
      paragraphs: [
        "This policy will change as the service does. The date at the top of the page says when it last did.",
      ],
    },
  ],
};
