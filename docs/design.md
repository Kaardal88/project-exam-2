# Design Philosophy

The interface should feel creative without becoming visually overwhelming. It uses unique texture backgrounds on some elements to make it look like studio hardware.

Important principles:

- Clean layouts
- Strong visual hierarchy
- Fast navigation
- Mobile-first responsiveness
- Consistent spacing
- Accessible UI
- Scandinavian-inspired design
- Do not use "bg-dark" or anything who can offset the design on different devices. The design is by default dark and currently there is no option for changing to light mode.
- Reuse colors already in use.
- **Stem colours are the one exception, and they are data rather than palette.**
  A band picks the colour of its own lanes, it is stored on the row and rendered
  through an inline style, and it never becomes a Tailwind class. Used as a lane
  accent only — never as a text colour, because a band is free to pick a
  near-black and a lane made unreadable by its own colour is worse than a dark
  one.

The application should feel like professional creative software rather than a traditional business application.

Long term plan:

- Implement "settings" in user and band profile which makes them able to change themes (custom, dark, light, brown, studio layout)

---
