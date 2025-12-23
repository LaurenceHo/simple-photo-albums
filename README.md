# PrimeVue photo albums web app

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
        <li><a href="#architecture">Architecture</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#create-s3-bucket">Create S3 bucket</a></li>
        <li><a href="#integrate-with-imagekit">Integrate with ImageKit</a></li>
        <li><a href="#mapbox-api-key">Mapbox API key</a></li>
        <li><a href="#aws-lambda-function">AWS Lambda Function</a></li>
      </ul>
    </li>
    <li>
      <a href="#how-to-run-locally">How to run locally</a>
    </li>
  </ol>
</details>

## About The Project

This is a fullstack photo album web app using Vue3, PrimeVue, Tailwind CSS, Tanstack Query, Hono, Cloudflare Workers, Cloudflare D1 and AWS S3. You can use this web app to display your photos in S3 bucket and manage your photos and albums. This app is supposed to be used by a small group of people (e.g. family members) so it doesn't have any user management feature.

### Built With

[![Vite][vite]][vite-url][![Vue][Vue.js]][Vue-url][![Tailwind CSS][tailwindcss]][tailwindcss-url][![TypeScript][typescript]][type-url][![Vitest][vitest]][vitest-url][![Hono][hono]][hono-url][![Cloudflare][cloudflare]][cloudflare-url][![AWS][aws]][aws-url]

## Getting started

### Prerequisites

You will need the follows:

1. Google Place API key (For admin manage albums)
2. Google OAuth 2.0 Client ID (For admin access)
3. AWS user and role with S3 permission for your local development and deployment
4. AWS S3 bucket (For storing photos. **You need to create this manually.** )
5. Cloudflare account (For Workers and D1 database)
6. ImageKit account (It's optional)
7. Mapbox API key (For displaying map)

‼️ **️Important** ‼️

Before you start local development, you will need to set up Cloudflare D1 and environment variables. Please check further
information in the `server` folder [here](server/README.md).

### After deploying app to Cloudflare

After deploying the backend to Cloudflare, replace properties `VITE_STATIC_FILES_URL` and
`VITE_IMAGEKIT_CDN_URL` (There are 2 `VITE_IMAGEKIT_CDN_URL` env variables, one is in the root folder, another one is in the server folder) with your configured URLs in `.env.example` and modify file name to `.env`.

### Integrate with ImageKit

In order to reduce the traffic with S3 bucket (to save money!), this project integrate with ImageKit CDN. ImageKit.io is a cloud-based image CDN with real-time image optimisation and transformation features that help you deliver perfectly optimised images across all devices[2]. You can follow this [documentation](https://imagekit.io/blog/image-optimization-resize-aws-s3-imagekit/) to create an account in the ImageKit. You will have 20GB bandwidth per month as a free user. Once you have your own ImageKit URL, replace this property `VITE_IMAGEKIT_CDN_URL` with your real information in`.env.example` and modify file name to `.env`. And
use the same URL in the `server` folder.

#### Important

If you change S3 bucket name, don't forget to update the configuration in ImageKit, and AWS IAM permission for Imagekit.

### Mapbox API key

This project uses Mapbox to display the [map](https://dqhkiwysc6ltq.cloudfront.net/map/albums). You can get your own Mapbox API key [here](https://account.mapbox.com/auth/signup/). Once you have your own Mapbox API key, replace this property `VITE_MAPBOX_API_KEY` with your real information in `.env.example` and modify file name to `.env`.

### Google OAuth 2.0 client ID

Please check [here](https://developers.google.com/identity/protocols/oauth2) for further information. You will also need to set up OAuth consent screen. Please check [here](https://developers.google.com/identity/protocols/oauth2/openid-connect#consent-screen). Once you have Google OAuth 2.0 client ID, replace this property `VITE_GOOGLE_CLIENT_ID` with your real information in `.env.example` and modify file name to `.env`. And use the same client ID in the `server` folder.

#### Login UI

This project uses Google OAuth 2.0 to authenticate users. If you don't want to use Google OAuth 2.0, you will need to implement login UI and authentication process by yourself. Once you set up Google OAuth 2.0 client ID and OAuth consent screen, you can access login UI by going to `http://localhost:9000/login`. You will also need to add your Google account information in the D1 database you created. If every thing is set up correctly, you should be able to login with your Google account and see the admin features including album and photo management. If you just want to have a quick glance of UI, you can simply run `bun run msw`, it will launch UI on http://localhost:5173.

### Cloudflare Workers

This project uses Cloudflare Workers to handle all APIs (as BFF, backend for frontend) and authentication process.

## How to run locally

### Install the dependencies

```bash
$ bun install
```

### Start the app in MSW mode (without server running)

```bash
$ bun run msw
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
$ bun run dev
```

### Lint the files

```bash
$ bun run lint
```

### Run unit tests

```bash
$ bun run test:unit
```

### Build the app for production

```bash
$ bun run build
```

### Customize the Quasar configuration

See [Configuring quasar.conf.js](https://v2.quasar.dev/quasar-cli/quasar-conf-js).

### References

1. [CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html)
2. [Optimize and resize images in AWS S3 in real-time with ImageKit](https://imagekit.io/blog/image-optimization-resize-aws-s3-imagekit/)

<!-- MARKDOWN LINKS & IMAGES -->

[vitest]: https://img.shields.io/badge/Vitest-%236E9F18?style=for-the-badge&logo=Vitest&logoColor=%23fcd703
[vitest-url]: https://vitest.dev/
[Vue.js]: https://img.shields.io/badge/Vue%20js-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D
[Vue-url]: https://vuejs.org/
[aws]: https://img.shields.io/badge/Amazon_AWS-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white
[aws-url]: https://aws.amazon.com/
[typescript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[type-url]: https://www.typescriptlang.org/
[vite]: https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E
[vite-url]: https://vitejs.dev/
[fastify]: https://img.shields.io/badge/fastify-202020?style=for-the-badge&logo=fastify&logoColor=white
[fastify-url]: https://fastify.dev/
[tailwindcss]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[tailwindcss-url]: https://tailwindcss.com/
[hono]: https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white
[hono-url]: https://hono.dev/
[cloudflare]: https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white
[cloudflare-url]: https://www.cloudflare.com/
