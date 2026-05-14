# NaeVerse

NaeVerse is a full-stack social media web application, this was assigned and build as internship project while working at CodeAlpha and it's design is inspired by TikTok. Users can share images and videos, like posts, comment, follow other users, and manage their profiles.

## Internship Information

- _Internship Provider:_ CodeAlpha
- _Duration:_ 1 May 2026 – 29 May 2026
- _Developer:_ Naeemullah
- _Project Type:_ Full-Stack Social Media Web Application

## Live Links

- _GitHub Repository:_ [CodeAlpha_NaeVerse](https://github.com/Naeemu11ah/CodeAlpha_NaeVerse.git)
- _Demo Video:_ [Add your video link here]
- _Live Link:_ `Not live yet!`

## Features

### Authentication & authorization

- Sign Up
- Login
- Logout
- Secure password hashing
- Change password

### User Profile

- View profile
- Edit name, username, and bio
- Change profile picture
- View followers and following
- Delete account with complete data cleanup

### Posts

- Upload image and video posts
- Add captions
- Edit posts
- Delete posts
- View all posts

### Social Features

- Like and unlike posts
- Add and delete comments
- Follow and unfollow users
- Quick follow button directly on posts

### Feeds

- For You feed (all posts)
- Following feed (posts from followed users)

### Search

- Search for users and posts
- Results page with separate tabs

### Profile Tabs

- Posts
- Liked Posts

### Responsive Design

- Desktop layout with sidebar
- Mobile layout with top navbar, bottom navbar, and offcanvas menu

### Theme Support

- Light mode
- Dark mode

### Validation

- Client side using Bootstrap validation
- Server side using Joi
- Database side using schemas

## Technology Stack

### Backend

- Node.js
- Express.js

### Database

- MongoDB
- Mongoose

### Frontend

- EJS
- Bootstrap
- JavaScript

### Media Storage

- Cloudinary

## Database Schemas

- User
- Post
- Comment

## Account Deletion Process

When a user deletes their account, the following data is permanently removed:

- User profile
- Posts
- Comments
- Likes
- Followers
- Following
- Profile picture from Cloudinary
- Post media from Cloudinary

## Required Internship Features

The core internship requirements included:

- User Profiles
- Posting
- Comments and Like System
- Follow/Unfollow System

## Additional Features

To make the project more advanced, the following features were added:

- Search functionality
- Light and dark mode
- Responsive design
- Password change
- Full account deletion
- Quick follow button

## How to use

```text
Installation

1. Clone the repository.
2. Open the project folder.
3. Install dependencies: "npm install"
4. Create a .env file and add (not essential for local execution):

CLOUD_NAME= ****
API_KEY= ****
API_SECRET= ****
MONGODB_ATLAS_URL= ****
MY_SECRET= ****

5. Start the server:
6. Open "http://localhost:3000" in browser.

```

## Recommended Viewing Experience

For the best experience use a `laptop or desktop` with `Dark mood` enabled.

## Developed by

This project was developed for educational and internship purposes by `Naeemullah`, a Software Engineering Student at university of swat.
This is one of my main projects to practice MERN Stack WEB Development, and was made during the `CodeAlpha` Internship.
