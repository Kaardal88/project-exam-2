# StemLock

A unified workspace for bands, artists, and everyone around them — from idea to finished song.

Started as a school exam, now continued as a long-term portfolio project with the ambition of becoming a real product.

<img width="1317" height="1194" alt="ChatGPT Image Sep 2, 2026, 10_48_33 AM" src="https://github.com/user-attachments/assets/e40b8c9b-7d22-4360-bb60-aed093645bf3" />


## What is StemLock?

StemLock is a modern web platform for musicians, bands, producers, managers, and other people in the music industry. I aim to be a platform for everyone, from garage band to the established bands with 20+ years on the stage. 

The goal is one place where a band can organize everything related to their music project: members, releases, planning, collaboration, and communication. Rather than being another social media platform, StemLock is meant to work as an internal workspace for the creative team, while still allowing selected information to be shared publicly through a band profile. The last part gives the fans, or potential fans, the opportunity to keep an eye of the band without creating account. More and more content can be made public with time, all decided by the band itself and what they choose to share. 

Each band get's their own workspace, and the workspace is song-specific. You have total version control as the songs grows. Each stem uploaded IS the latest version. As the song reach it's final touches you lock it for mix, and the current version you lock is the finished one at that point. You can unlock it as well. 

## Who is StemLock for? 

- Bands and solo artists
- Producers, songwriters and session muscicians
- Mixing and mastering engineers 
- Labels and studios (on the todo-list)
- Artwork designers (on the todo-list)

## What problems does StemLock solve?

I (the developer of this app) is a guitar player, composer, mix engineer and artwork designer myself - so this app solves my issues as well. The main idea the platform was built upon was the wish for my vocalist to be able to have more access, leave comment on timestamps in the song, upload content himself and gain more structure and control - all in one place, just for us, without many other apps involved but with many functionalities. 
Talking to other bands before developing, I quickly saw that this is a problem for many bands. 

Example: 

Take the classic "chaos band". They have five band members, two of them is members in three other bands. They use messenger for never ending communications, things get lost in the chat, most of the content is all fun and memes and many members forget what they were supposed to do, how far the song is come, where they are in the process in general. And they have three other bands to tend to...

These bands spread their work across multiple disconnected tools, like: 

- Messenger/Discord for communication
- Google Drive/Dropbox for files
- Notes apps for lyrics
- Trello/Slack/Notion for planning
- Shared calendars
- Social media for their public content

And some of them probably isn't using any of it. 

The stored work is maybe on the studio laptop, your phone, or on the computer at home - and you forgot to share the file... 

StemLock brings these workflows together into a single platform built with all of this in mind, so less time goes to chaos and more time into making music together. 

## Key features

This version:

- User accounts and authentication
- Band accounts and member invitations
- Role-based access (band_leader, member, guest)
- Public band profile with bio, social links, country, description
- Band event calendar and private calendar which makes you see your bands events
- Member management
- Responsive design
- Song workspace dashboard with studio, tasks, notes, lyrics, version control, song info, project management board, files, comments

### The core concept 
The media player: A band can upload and play a song, pause it at a specific point in time, leave a comment right there, and assign a task/ticket to the right person (guitarist, drummer, bassist, etc.). Third parties like a manager or studio engineer can be invited onto the same band profile — through conditional rendering, the further they are from the core of the band, the smaller and more limited their view becomes.

### On the roadmap
Albums, singles, and EPs with metadata; a work-in-progress dashboard with tasks and deadlines; file and audio uploads via Cloudflare; rehearsal and tour planning; a follow/activity feed (on the todo-list).

## Tech stack


- Frontend - Next.js / React, TypeScript, Tailwind CSS
- Backend -	Hono (API)
- Database - Neon Postgres via Drizzle ORM
- Validation - Zod
- Auth - JWT (migrating from localStorage to httpOnly cookies)
- Files/media - Cloudflare (planned for audio and image files)

The design language is dark, clean, and Scandinavian-inspired, with a touch of studio-hardware texture — built to feel like professional creative software rather than a traditional admin panel.

## Get started

### Install

```bash
git clone <repo-url>
cd project-exam-2
npm install
```

### Start dev server

```bash
npm run dev
```

## Project status

StemLock is now ready for external test users. The focus is to test core flow and discover potential bugs. Test users have the opportunity to give feedback during testing via Feedback button. Those feedbacks shows in developers feedback inbox, and only there, and I can respond and mark as "resolved". Test user are encouraged to not only write if something is broken, but to send in whishes for functionality as well. That way further development is in fact with people in the industry best interests in mind. 

