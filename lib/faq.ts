import { appName } from "@/components/Stemlock";
import { CONTACT_EMAIL } from "@/lib/legal";

/**
 * The FAQ, as the plain-language counterpart to lib/legal.ts.
 *
 * Deliberately not a manual. "How do I upload a stem" belongs next to the
 * upload button, where someone is already standing; this page answers the
 * questions that stop a person before they get that far -- what is this, who
 * hears my music, what happens to my files.
 *
 * Anything here that also appears in Terms or Privacy has to keep saying the
 * same thing. When you change one, check the other two.
 */

export type FaqItem = {
  /** Doubles as the anchor, so the app can link straight to one answer. */
  id: string;
  question: string;
  answer: string[];
};

export type FaqGroup = {
  group: string;
  items: FaqItem[];
};

export const faqIntro = `Short answers about ${appName} — what it is, who can hear your music, and what it does not do yet.`;

export const faq: FaqGroup[] = [
  {
    group: "Getting started",
    items: [
      {
        id: "what-is-it",
        question: `What is ${appName}?`,
        answer: [
          "A shared workspace for a band: members, projects, songs, and every version of every song in one place. Less social network, more the folder your band wishes it had.",
        ],
      },
      {
        id: "is-it-finished",
        question: "Is it finished?",
        answer: [
          "Not yet. We are in a test round, so things will move, occasionally break, and now and then vanish. Keep your own copies of anything you would hate to lose.",
        ],
      },
      {
        id: "how-do-i-start",
        question: "How do I start?",
        answer: [
          "Create a band, or accept an invitation to one. Everything else — projects, songs, stems — hangs off a band.",
        ],
      },
      {
        id: "where-are-invitations",
        question: "Someone invited me. Where did it go?",
        answer: [
          "Your invitations inbox. Band invitations and project invitations land in the same place. An invitation you have not accepted gives you no access to anything.",
        ],
      },
    ],
  },
  {
    group: "Bands and people",
    items: [
      {
        id: "multiple-bands",
        question: "Can I be in more than one band?",
        answer: [
          "As many as you like. They stay completely separate, and nothing leaks between them.",
        ],
      },
      {
        id: "what-leaders-do",
        question: "What can a band leader do that I cannot?",
        answer: [
          "Edit the band profile, manage members and projects, and decide which takes become a version. Everything else is open to the whole band.",
        ],
      },
      {
        id: "what-is-a-guest",
        question: "What is a guest?",
        answer: [
          "Someone invited to one project instead of to the band — a producer, an engineer, a session musician, a manager. They see that project and nothing else you are working on.",
        ],
      },
      {
        id: "guest-permissions",
        question: "What can a guest do inside that project?",
        answer: [
          "The same as a member, for now: listen, comment, upload takes. The wall is around the project, not inside it. A session musician who cannot hand in their take is not much use.",
          "Narrower guest permissions are on the list, once real guests have shown us which ones they actually want.",
        ],
      },
    ],
  },
  {
    group: "Songs, stems and versions",
    items: [
      {
        id: "what-is-a-stem",
        question: "What is a stem?",
        answer: [
          "One layer of a song as its own file — the drums, a guitar, a vocal. They play together, and you can mute or solo any of them while they do.",
        ],
      },
      {
        id: "only-one-file",
        question: "I only have one finished mp3. Can I still use this?",
        answer: [
          "Yes. That is a song with one stem, and it behaves exactly like every other song. Nothing here requires you to own a studio.",
        ],
      },
      {
        id: "what-is-a-version",
        question: "What is a version?",
        answer: [
          "The whole arrangement at one moment, saved as its own complete set of files. Closer to a commit than to a save.",
        ],
      },
      {
        id: "can-i-break-an-old-version",
        question: "Can I break an old version by fixing something?",
        answer: [
          "No. Every version holds its own files, so re-recording a guitar today cannot change what an approved mix from March sounds like. That is the whole reason versions work this way.",
        ],
      },
      {
        id: "who-decides",
        question: "Who decides what the song actually is?",
        answer: [
          "Anyone with access to the project can hand in a take. Only a band leader turns takes into a version. Handing something in and deciding are meant to be two different acts.",
        ],
      },
      {
        id: "restoring",
        question: "I restored an older version. Did I lose the newer ones?",
        answer: [
          "No. Restoring writes a new version on top of the pile rather than winding the pile back, so the history stays a straight line.",
        ],
      },
      {
        id: "getting-files-out",
        question: "Can I get my files back out?",
        answer: [
          "Any time. Download a version as one mixdown, as separate stems, or bounce exactly what you are hearing — mutes, solos and all — to a single MP3 in the browser.",
        ],
      },
    ],
  },
  {
    group: "Sharing and privacy",
    items: [
      {
        id: "who-can-hear",
        question: "Who can hear my music?",
        answer: [
          "Your band, and guests on the projects they were invited to. Audio is never public: it is served through links signed for you that then expire.",
        ],
      },
      {
        id: "visibility",
        question: "What do public, unlisted and private mean?",
        answer: [
          "They apply to your band profile. Public is listed on the bands page and visible to anyone; unlisted is hidden from the list but open to anyone with the link; private is members only.",
        ],
      },
      {
        id: "are-images-public",
        question: "Are my pictures public?",
        answer: [
          "Yes — avatars, headers and project covers. They have to load as ordinary images, so they sit in a public bucket and stay reachable by their address even when the band is private.",
          "Treat a picture as public from the moment you upload it. The music does not work this way; the pictures do.",
        ],
      },
    ],
  },
  {
    group: "Your account, and what we cannot do yet",
    items: [
      {
        id: "forgot-password",
        question: "I forgot my password.",
        answer: [
          `There is no reset yet — it needs an email provider, and that is coming. Until then, write to ${CONTACT_EMAIL} and we will sort it out by hand.`,
        ],
      },
      {
        id: "other-devices",
        question:
          "I changed my password. Why am I still signed in on my phone?",
        answer: [
          "A session is a token with a seven-day life, and changing your password does not reach a device already holding one. A known limitation, and one we would rather tell you about than hide.",
        ],
      },
      {
        id: "deleting-account",
        question: "How do I delete my account?",
        answer: [
          "From Settings. You see first what it does to each band you are in — some pass to another leader, some go with you — and then it happens immediately.",
        ],
      },
      {
        id: "something-broken",
        question: "Something is broken, or I have an idea.",
        answer: [
          "Use the feedback button. It is on every page while you are signed in, it comes straight to us, and you will see the reply on the same page you sent it from.",
        ],
      },
    ],
  },
];
