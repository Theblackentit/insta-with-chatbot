# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Visual image crop dialog for avatars and posts (drag image + zoom, then apply).
- Avatar output normalized to `256x256`; post output normalized to square `1080x1080`.
- Home feed and Explore collage view (image-only discover grid).
- Search accounts and captions, with account results that support follow directly.
- Clickable usernames/avatars on posts/comments to open that account profile.
- Follow/unfollow + follower/following lists.
- Like posts and like individual comments.
- Fullscreen reels mode with down-arrow navigation.
- Sidebar Messages view with fake DM threads.
- Data saved in browser `localStorage` only (no backend).

## Run

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.
