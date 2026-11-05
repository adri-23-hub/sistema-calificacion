This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Compilación en Windows

`npm run dev` y `npm run build` usan Webpack, compatible con Next.js 16.4.3. Turbopack falla en este entorno al iniciar el proceso de PostCSS (el proceso termina antes de conectarse). Esta elección permite compilar sin cambiar las reglas de la aplicación ni las dependencias de Next.js.

Las fuentes del diseño se sirven localmente desde `src/app/fonts`, con sus licencias incluidas; la compilación no necesita descargarlas.


### Seguridad de sesiones

Configurar `AUTH_SECRET` con una clave aleatoria de al menos 32 bytes antes de iniciar o compilar. Puede generarse con `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"`. Guardarla en `.env.local` o en las variables privadas del alojamiento; nunca subirla al repositorio. Todos los servidores del mismo entorno deben compartir la clave.

Esta versión invalida las sesiones anteriores: los usuarios deben volver a iniciar sesión. El acceso requiere una cuenta real activa en la base de datos; no existe autenticación alternativa de demostración. La configuración de producción debe actualizarse por separado.
